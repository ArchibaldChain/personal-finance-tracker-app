import client from './client';

interface UserRead {
  id: number;
  display_name: string;
  email: string;
  avatar_url: string | null;
}

export interface TokenResponse {
  token: string;
  user: UserRead;
}

export async function googleSignIn(accessToken: string): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/auth/google', { access_token: accessToken });
  return data;
}

export async function localSignIn(userId: number): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/auth/local', { user_id: userId });
  return data;
}