import ExpiredLink from '@/components/ExpiredLink';

export default async function ExpiredPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return <ExpiredLink shortCode={code || 'unknown'} />;
}
