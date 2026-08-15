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
  name: 'A B Aditya',
  role: 'Cybersecurity Analyst',
  location: 'Chennai, India',
  email: 'a.b.aditya.0101@gmail.com',
  summary:
    'I’m a cybersecurity student with a background in software development. I’m building practical experience in security monitoring, digital forensics, networking, and GRC. I enjoy understanding how systems work, finding where they fail, and learning how to protect them.',
  socialLinks: [],
};

export const resume: ResumeData = {
  profile,
  experience: [],
  competitions: [],
  credentials: [],
};
