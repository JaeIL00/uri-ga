export interface SessionBootstrapRequest {
  mode: 'create' | 'join';
  familyName?: string;
  inviteCode?: string;
  displayName: string;
}

export interface SessionMeDto {
  userId: string;
  familyId: string;
  displayName: string;
  familyName: string;
  inviteCode: string;
}
