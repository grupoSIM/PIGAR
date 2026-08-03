export type AuthenticatedActor = {
  profileId: string;
  role: "CLIENT" | "DISPATCHER" | "ADMIN";
  subject: string;
};
