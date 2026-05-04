import client from './client';

interface UserRead {
  id: number;
  display_name: string;
  email: string;
  avatar_url: string | null;
}

export async function googleSignIn(accessToken: string): Promise<UserRead> {
  const { data } = await client.post<UserRead>('/auth/google', { access_token: accessToken });
  return data;
}
