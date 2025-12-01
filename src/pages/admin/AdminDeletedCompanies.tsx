import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Building2, ArrowLeft, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AdminDeletedCompanies = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.adminGetDeletedCompanies();
      setCompanies(response.data.companies);
    } catch (err: any) {
      toast({
        title: "Error loading deleted companies",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <div className="min-h-screen p-6 bg-background">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/admin" className="flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="w-5 h-5" />
          Back to Admin Dashboard
        </Link>

        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Trash2 className="w-8 h-8 text-destructive" />
          Deleted Companies
        </h2>
      </div>

      {/* LIST */}
      <Card className="p-6 border border-border bg-card">
        {loading ? (
          <p className="text-muted-foreground">Loading deleted companies...</p>
        ) : companies.length === 0 ? (
          <p className="text-muted-foreground text-sm">No deleted companies found.</p>
        ) : (
          <ul className="space-y-4">
            {companies.map((c: any) => (
              <li
                key={c.id}
                className="border-b pb-4 border-border last:border-b-0 last:pb-0 flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-5 h-5 text-destructive" />
                    <span className="font-semibold">{c.name}</span>
                  </div>

                  <p className="text-muted-foreground text-sm">
                    Code: <span className="font-medium">{c.companyCode}</span>
                  </p>

                  {c.industry && (
                    <p className="text-muted-foreground text-sm">Industry: {c.industry}</p>
                  )}

                  <p className="text-xs text-muted-foreground mt-1">
                    Deleted at: {new Date(c.deletedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/admin/companies/${c.id}`}
                    className="text-primary hover:underline"
                  >
                    View Details
                  </Link>

                  {/* Uncomment this if you add a restore endpoint later */}
                  {/* 
                  <Button size="sm" variant="outline">
                    Restore
                  </Button>
                  */}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default AdminDeletedCompanies;
