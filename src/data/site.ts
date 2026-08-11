export interface SocialLink {
  label: string;
  href: string;
}

export interface ProfileData {
  name: string;
  role: string;
  location: string;
  email: string;
  summary: string;
  socialLinks: readonly SocialLink[];
}

export interface ExperienceRecord {
  organization: string;
  role: string;
  startDate: string;
  endDate?: string;
  summary: string;
}

export interface CompetitionRecord {
  event: string;
  type: string;
  date: string;
  format: string;
  result?: string;
  contribution?: string;
  evidenceUrl?: string;
}

export interface CredentialRecord {
  name: string;
  issuer: string;
  issuedOn?: string;
  credentialUrl?: string;
}

export interface ResumeData {
  profile: ProfileData;
  experience: readonly ExperienceRecord[];
  competitions: readonly CompetitionRecord[];
  credentials: readonly CredentialRecord[];
}

export const profile: ProfileData = {
  name: '[Add your name]',
  role: '[Add your target role]',
  location: '[Add your location]',
  email: '[Add your professional email]',
  summary: '[Add your short professional summary]',
  socialLinks: [],
};

export const resume: ResumeData = {
  profile,
  experience: [],
  competitions: [],
  credentials: [],
};
