import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { api, Assistant } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Assistants = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = async () => {
    try {
      setLoading(true);
      const response = await api.getAssistants();
      setAssistants(response.data.assistants);
    } catch (error) {
      console.error('Failed to fetch assistants:', error);
      toast({
        title: "Error",
        description: "Failed to load assistants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAssistants = assistants.filter(
    (assistant) =>
      assistant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assistant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assistant.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-primary font-bold text-2xl">
            admiino<span className="text-accent">°</span>
          </h1>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Browse Assistants</h2>
          <p className="text-muted-foreground">Find the perfect assistant for your tasks</p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name or specialization..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading assistants...</p>
          </div>
        ) : filteredAssistants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No assistants found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssistants.map((assistant) => (
              <div key={assistant.id} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-xl">
                      {assistant.firstName.charAt(0)}
                      {assistant.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">
                      {assistant.firstName} {assistant.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2 capitalize">
                      {assistant.specialization} Specialist
                    </p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= assistant.rating
                              ? "fill-accent text-accent"
                              : "text-muted"
                          }`}
                        />
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">
                        ({assistant.rating.toFixed(1)})
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      assistant.isAvailable
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }
                  >
                    {assistant.isAvailable ? "Available" : "Busy"}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {assistant.bio}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {assistant.skills.slice(0, 3).map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Hourly Rate</p>
                    <p className="font-bold text-lg">${assistant.hourlyRate}/hr</p>
                  </div>
                  <Button disabled={!assistant.isAvailable}>
                    {assistant.isAvailable ? "Hire Now" : "Not Available"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Assistants;
