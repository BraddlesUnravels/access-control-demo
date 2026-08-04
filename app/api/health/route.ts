import { NextResponse } from 'next/server';

export const GET = () => {
  return NextResponse.json(
    {
      status: 'ok',
      checkedAt: new Date().toISOString(),
    },
    { status: 200 },
  );
};
