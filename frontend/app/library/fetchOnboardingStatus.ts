export type OnboardingStatus = {
  role: string;
  library: {
    id: string | number;
    name?: string;
    email?: string | null;
    approved: boolean;
    rejected: boolean;
  } | null;
};

export async function fetchOnboardingStatus(
  accessToken: string
): Promise<OnboardingStatus> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/library/onboarding/status`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error("Failed to load account status");
  }
  return res.json();
}
