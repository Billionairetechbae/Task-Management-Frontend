import OrgInvitationFlow from "@/components/orgActivation/OrgInvitationFlow";

/** Route: /claim-ownership#token=... (owner-designate acceptance). The server decides which kind of invitation the secret is. */
const ClaimOwnership = () => <OrgInvitationFlow />;
export default ClaimOwnership;
