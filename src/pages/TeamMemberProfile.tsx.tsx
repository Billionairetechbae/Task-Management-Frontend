import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ArrowLeft, Mail, User as UserIcon, Briefcase, Badge } from "lucide-react";

const TeamMemberProfile = () => {
  const { id } = useParams();
  const { toast } = useToast();

  const [member, setMember] = useState<User | null>(null);

  useEffect(() => {
    loadMember();
  }, []);

  const loadMember = async () => {
    try {
      const res = await api.getUserById(id!);
      setMember(res.data.user);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!member) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <Logo className="h-8" />
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <Button variant="outline" asChild className="mb-6">
          <Link to="/team-directory">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Directory
          </Link>
        </Button>

        <div className="bg-card border border-border rounded-2xl p-8 text-center">

          {/* Profile Picture */}
          {member.profilePictureUrl ? (
            <img
              src={member.profilePictureUrl}
              className="w-28 h-28 mx-auto rounded-full object-cover mb-4"
            />
          ) : (
            <div className="w-28 h-28 bg-primary/10 mx-auto rounded-full flex items-center justify-center text-3xl font-bold text-primary mb-4">
              {member.firstName[0]}
            </div>
          )}

          <h2 className="text-3xl font-bold mb-2">
            {member.firstName} {member.lastName}
          </h2>

          <Badge className="mb-3">{member.role.toUpperCase()}</Badge>

          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" /> {member.email}
          </p>

          {member.specialization && (
            <p className="mt-3 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Briefcase className="w-4 h-4" />
              {member.specialization}
            </p>
          )}

          {member.bio && (
            <p className="mt-6 text-sm">{member.bio}</p>
          )}

        </div>
      </main>
    </div>
  );
};

export default TeamMemberProfile;
