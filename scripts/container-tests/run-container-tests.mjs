import { randomBytes } from 'node:crypto';
import {
  getContainerNetwork,
  printContainerLogs,
  removeContainer,
  run,
} from './docker.mjs';
import {
  assert,
  assertJson,
  assertStatus,
  CookieJar,
  waitForHealth,
} from './http.mjs';
import {
  createAuthenticatedCookieJar,
  createStageInvite,
  getProjectId,
  getSupabaseAuthCookieName,
  getSupabaseEnvironment,
} from './supabase.mjs';
import {
  STUDENT_1_DEMO_PASSWORD,
  STUDENT_2_DEMO_PASSWORD,
  ADMIN_DEMO_PASSWORD,
} from '../../lib/demo-account-passwords.ts';

const imageName = process.env.CONTAINER_IMAGE ?? 'access-control-demo:stage';
const containerName = process.env.CONTAINER_NAME ?? 'access-control-demo-stage';
const hostPort = process.env.CONTAINER_PORT ?? '3100';
const supabaseCliVersion = process.env.SUPABASE_CLI_VERSION ?? '2.110.0';
const accessGateDisabled = process.env.ACCESS_GATE_DISABLED ?? 'false';
const accessGateCodeSecret = process.env.ACCESS_GATE_CODE_SECRET;
const accessGateCookieSecret = process.env.ACCESS_GATE_COOKIE_SECRET;

const sourceRepository = [
  process.env.GITHUB_SERVER_URL,
  process.env.GITHUB_REPOSITORY,
]
  .filter(Boolean)
  .join('/');

const MINIMUM_SECRET_LENGTH = 32;

const DEMO_ACCOUNTS = {
  student1: {
    email: 'student1@lms.com',
    password: STUDENT_1_DEMO_PASSWORD,
  },

  student2: {
    email: 'student2@lms.com',
    password: STUDENT_2_DEMO_PASSWORD,
  },

  admin: {
    email: 'admin@lms.com',
    password: ADMIN_DEMO_PASSWORD,
  },
};

const requireStageSecret = (name, value) => {
  if (!value || value.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(
      `${name} must be at least ${MINIMUM_SECRET_LENGTH} characters for container-stage testing.`,
    );
  }

  return value;
};

const stageCodeSecret = requireStageSecret(
  'ACCESS_GATE_CODE_SECRET',
  accessGateCodeSecret,
);

const stageCookieSecret = requireStageSecret(
  'ACCESS_GATE_COOKIE_SECRET',
  accessGateCookieSecret,
);

const main = async () => {
  const projectId = getProjectId();

  const kongContainerName = `supabase_kong_${projectId}`;

  const networkName = getContainerNetwork(kongContainerName);

  const internalSupabaseUrl = `http://${kongContainerName}:8000`;

  const { externalSupabaseUrl, publishableKey, serviceRoleKey } =
    getSupabaseEnvironment({
      cliVersion: supabaseCliVersion,
    });

  const stageInviteCode = await createStageInvite({
    supabaseUrl: externalSupabaseUrl,
    serviceRoleKey,
    codeSecret: stageCodeSecret,
  });

  removeContainer(containerName);

  try {
    /*
     * -----------------------------------------------------------------------
     * Production container setup
     * -----------------------------------------------------------------------
     */
    run('docker', [
      'build',
      '--file',
      'docker/Dockerfile',
      '--platform',
      'linux/amd64',
      '--progress',
      'plain',
      '--build-arg',
      `SOURCE_REPOSITORY=${sourceRepository}`,
      '--tag',
      imageName,
      '.',
    ]);

    run('docker', [
      'run',
      '--detach',
      '--name',
      containerName,
      '--platform',
      'linux/amd64',
      '--network',
      networkName,
      '--publish',
      `${hostPort}:3000`,
      '--env',
      `NEXT_SUPABASE_URL=${internalSupabaseUrl}`,
      '--env',
      `NEXT_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
      '--env',
      `ACCESS_GATE_DISABLED=${accessGateDisabled}`,
      '--env',
      `ACCESS_GATE_CODE_SECRET=${stageCodeSecret}`,
      '--env',
      `ACCESS_GATE_COOKIE_SECRET=${stageCookieSecret}`,
      imageName,
    ]);

    const applicationUrl = `http://127.0.0.1:${hostPort}`;

    /*
     * -----------------------------------------------------------------------
     * Infrastructure
     * -----------------------------------------------------------------------
     */
    await waitForHealth(`${applicationUrl}/api/health`);

    /*
     * Verify that the production application container itself can
     * communicate with Supabase over the Docker network.
     */
    run('docker', [
      'exec',
      containerName,
      'node',
      '-e',
      [
        `const url = ${JSON.stringify(
          `${internalSupabaseUrl}/auth/v1/health`,
        )};`,
        `const key = ${JSON.stringify(publishableKey)};`,
        'fetch(url, {',
        '  headers: { apikey: key },',
        '  signal: AbortSignal.timeout(5000),',
        '})',
        '  .then((response) => {',
        '    if (!response.ok) {',
        '      throw new Error(',
        '        `Supabase Auth health returned ${response.status}`,',
        '      );',
        '    }',
        '  })',
        '  .catch((error) => {',
        '    console.error(error);',
        '    process.exit(1);',
        '  });',
      ].join('\n'),
    ]);

    /*
     * -----------------------------------------------------------------------
     * Access gate
     * -----------------------------------------------------------------------
     */

    await assertStatus(`${applicationUrl}/`, 200);

    await assertStatus(`${applicationUrl}/auth/login`, 307);

    await assertStatus(`${applicationUrl}/api/consultations`, 401);

    /*
     * Confirm an invalid invite reaches the real redemption path
     * and is rejected.
     */
    await assertStatus(`${applicationUrl}/api/access/unlock`, 401, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'ACD-STAGE-INVALID',
      }),
    });

    /*
     * Create and redeem a real disposable stage invite.
     */
    const gateCookieJar = new CookieJar();

    const unlockPayload = await assertJson(
      `${applicationUrl}/api/access/unlock`,
      200,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: stageInviteCode,
        }),
      },
      gateCookieJar,
    );

    assert(
      unlockPayload?.data?.label === 'Container stage integration',
      'Access-gate redemption returned an unexpected invite label.',
    );

    assert(
      Boolean(gateCookieJar.get('access_gate')),
      'Access-gate redemption did not set the access_gate cookie.',
    );

    /*
     * A valid invite grants access to the login experience but
     * does not itself authenticate the user.
     */
    await assertStatus(`${applicationUrl}/auth/login`, 200, {}, gateCookieJar);

    run('npm', ['run', 'test:container:browser'], {
      env: {
        ...process.env,
        BASE_URL: applicationUrl,
        ACCESS_GATE_COOKIE: gateCookieJar.get('access_gate'),
      },
    });

    await assertStatus(`${applicationUrl}/protected`, 307, {}, gateCookieJar);

    /*
     * -----------------------------------------------------------------------
     * Authentication
     * -----------------------------------------------------------------------
     *
     * Supabase is exposed differently to the test runner and
     * application container.
     *
     * Authentication happens against the host-accessible URL,
     * while the cookie name is derived from the URL used by the
     * application server.
     */
    const authCookieName = getSupabaseAuthCookieName(internalSupabaseUrl);

    const authCookieOptions = {
      baseCookieJar: gateCookieJar,
      supabaseUrl: externalSupabaseUrl,
      publishableKey,
      authCookieName,
    };

    const student1CookieJar = await createAuthenticatedCookieJar({
      ...authCookieOptions,
      account: DEMO_ACCOUNTS.student1,
    });

    const student2CookieJar = await createAuthenticatedCookieJar({
      ...authCookieOptions,
      account: DEMO_ACCOUNTS.student2,
    });

    const adminCookieJar = await createAuthenticatedCookieJar({
      ...authCookieOptions,
      account: DEMO_ACCOUNTS.admin,
    });

    /*
     * Verify SSR authentication through the production
     * application.
     */
    await assertStatus(
      `${applicationUrl}/protected`,
      200,
      {},
      student1CookieJar,
    );

    await assertStatus(`${applicationUrl}/protected`, 200, {}, adminCookieJar);

    /*
     * -----------------------------------------------------------------------
     * Student resource isolation
     * -----------------------------------------------------------------------
     */
    const student1Payload = await assertJson(
      `${applicationUrl}/api/consultations`,
      200,
      {},
      student1CookieJar,
    );

    const student2Payload = await assertJson(
      `${applicationUrl}/api/consultations`,
      200,
      {},
      student2CookieJar,
    );

    assert(
      Array.isArray(student1Payload.data) && student1Payload.data.length >= 2,
      'Student 1 did not receive the expected seeded consultations.',
    );

    assert(
      Array.isArray(student2Payload.data) && student2Payload.data.length >= 2,
      'Student 2 did not receive the expected seeded consultations.',
    );

    const student1UserIds = new Set(
      student1Payload.data.map((consultation) => consultation.student_user_id),
    );

    const student2UserIds = new Set(
      student2Payload.data.map((consultation) => consultation.student_user_id),
    );

    assert(
      student1UserIds.size === 1,
      'Student 1 consultation response was not ownership scoped.',
    );

    assert(
      student2UserIds.size === 1,
      'Student 2 consultation response was not ownership scoped.',
    );

    const [student1UserId] = student1UserIds;

    const [student2UserId] = student2UserIds;

    assert(
      student1UserId !== student2UserId,
      'Seeded student accounts unexpectedly resolved to the same owner.',
    );

    /*
     * -----------------------------------------------------------------------
     * Role boundaries
     * -----------------------------------------------------------------------
     */

    /*
     * Students cannot read the administrator endpoint.
     */
    await assertStatus(
      `${applicationUrl}/api/admin/consultations`,
      403,
      {},
      student1CookieJar,
    );

    /*
     * Administrators cannot use the student consultation
     * endpoint.
     */
    await assertStatus(
      `${applicationUrl}/api/consultations`,
      403,
      {},
      adminCookieJar,
    );

    /*
     * Administrator read-only access should include consultations
     * belonging to both seeded students.
     */
    const adminPayload = await assertJson(
      `${applicationUrl}/api/admin/consultations`,
      200,
      {},
      adminCookieJar,
    );

    const adminOwnerIds = new Set(
      adminPayload.data.map((consultation) => consultation.student_user_id),
    );

    assert(
      adminOwnerIds.has(student1UserId) && adminOwnerIds.has(student2UserId),
      'Administrator response did not include consultations from both students.',
    );

    /*
     * -----------------------------------------------------------------------
     * Cross-student ownership
     * -----------------------------------------------------------------------
     */

    const student2ConsultationId = student2Payload.data[0]?.id;

    assert(
      Boolean(student2ConsultationId),
      'Student 2 did not have a consultation available for ownership testing.',
    );

    /*
     * Student 1 must not be able to update Student 2's
     * consultation.
     *
     * Returning 404 avoids disclosing that another student's
     * resource exists.
     */
    await assertStatus(
      `${applicationUrl}/api/consultations/${student2ConsultationId}`,
      404,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
        }),
      },
      student1CookieJar,
    );

    /*
     * -----------------------------------------------------------------------
     * Student consultation lifecycle
     * -----------------------------------------------------------------------
     *
     * Only a representative successful mutation path belongs here.
     * Exhaustive validation and lifecycle edge cases remain in the
     * faster route/unit and database test suites.
     */

    const createPayload = await assertJson(
      `${applicationUrl}/api/consultations`,
      201,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'Container',
          lastName: 'Stage',
          reason: `Container integration ${randomBytes(6).toString('hex')}`,
          scheduledFor: '2030-01-15T10:00:00.000Z',
        }),
      },
      student1CookieJar,
    );

    const createdConsultation = createPayload.data;

    /*
     * Ownership should come from authentication, not caller
     * supplied data.
     */
    assert(
      createdConsultation?.student_user_id === student1UserId,
      'Created consultation was not owned by the authenticated student.',
    );

    assert(
      createdConsultation?.status === 'scheduled',
      'Created consultation did not begin in scheduled status.',
    );

    /*
     * scheduled -> completed
     */
    const completedPayload = await assertJson(
      `${applicationUrl}/api/consultations/${createdConsultation.id}`,
      200,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
        }),
      },
      student1CookieJar,
    );

    assert(
      completedPayload.data.status === 'completed' &&
        Boolean(completedPayload.data.completed_at),
      'Consultation completion did not persist the expected state.',
    );

    /*
     * completed -> cancelled
     */
    const cancelledPayload = await assertJson(
      `${applicationUrl}/api/consultations/${createdConsultation.id}`,
      200,
      {
        method: 'DELETE',
      },
      student1CookieJar,
    );

    assert(
      cancelledPayload.data.status === 'cancelled' &&
        Boolean(cancelledPayload.data.cancelled_at),
      'Consultation cancellation did not persist the expected state.',
    );

    /*
     * DELETE remains idempotent for an already cancelled
     * consultation.
     */
    const repeatedCancellationPayload = await assertJson(
      `${applicationUrl}/api/consultations/${createdConsultation.id}`,
      200,
      {
        method: 'DELETE',
      },
      student1CookieJar,
    );

    assert(
      repeatedCancellationPayload.data.status === 'cancelled',
      'Repeated consultation cancellation was not idempotent.',
    );

    /*
     * -----------------------------------------------------------------------
     * Cross-role persistence
     * -----------------------------------------------------------------------
     *
     * Read the changed record through the administrator application
     * endpoint rather than querying the database directly with the
     * service role.
     *
     * This keeps the final assertion end-to-end through a second
     * real application path.
     */
    const adminAfterMutationPayload = await assertJson(
      `${applicationUrl}/api/admin/consultations`,
      200,
      {},
      adminCookieJar,
    );

    assert(
      adminAfterMutationPayload.data.some(
        (consultation) =>
          consultation.id === createdConsultation.id &&
          consultation.status === 'cancelled',
      ),
      'Administrator did not observe the student mutation through the read-only endpoint.',
    );

    process.stdout.write(
      [
        '',
        'Container integration stage passed:',
        '- production Next.js image built successfully',
        '- application container passed its health check',
        '- application container reached the Supabase Auth container',
        '- access gate rejected invalid access and redeemed a real stage invite',
        '- valid invite access reached the authentication experience',
        '- seeded student and administrator accounts established SSR sessions',
        '- protected pages rendered for authenticated roles',
        '- student consultation reads remained ownership scoped',
        '- student and administrator API role boundaries were enforced',
        '- cross-student mutation was rejected',
        '- student create, complete, and cancel mutations persisted end to end',
        '- repeated cancellation remained idempotent',
        '- administrator read-only access observed the resulting student record',
        '',
      ].join('\n'),
    );
  } catch (error) {
    printContainerLogs(containerName);

    throw error;
  } finally {
    removeContainer(containerName);
  }
};

await main();
