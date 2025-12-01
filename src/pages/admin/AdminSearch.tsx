// import { useState } from "react";
// import { api } from "@/lib/api";
// import { useToast } from "@/hooks/use-toast";

// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Card } from "@/components/ui/card";
// import {
//   Search,
//   Users,
//   Briefcase,
//   Building2
// } from "lucide-react";
// import { Link } from "react-router-dom";

// const AdminSearch = () => {
//   const { toast } = useToast();

//   const [keyword, setKeyword] = useState("");
//   const [type, setType] = useState("");
//   const [results, setResults] = useState<any>(null);
//   const [loading, setLoading] = useState(false);

//     const handleSearch = async () => {
//     if (!keyword) {
//         return toast({
//         title: "Search required",
//         description: "Please enter a search term.",
//         variant: "destructive",
//         });
//     }

//     try {
//         setLoading(true);
//         const res = await api.adminSearch(keyword, type);
//         setResults(res.data);
//     } catch (err: any) {
//         toast({
//         title: "Search failed",
//         description: err.message,
//         variant: "destructive",
//         });
//     } finally {
//         setLoading(false);
//     }
//     };


//   const hasResults = results && (
//     results.users?.length > 0 ||
//     results.tasks?.length > 0 ||
//     results.companies?.length > 0
//   );

//   return (
//     <div className="min-h-screen bg-background p-6">

//       <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
//         <Search className="w-8 h-8 text-primary" />
//         Global Search
//       </h2>

//       {/* Search Controls */}
//       <div className="flex flex-col gap-4 md:flex-row mb-8">
//         <Input
//           placeholder="Search across companies, users, or tasks..."
//           value={keyword}
//           onChange={(e) => setKeyword(e.target.value)}
//           className="w-full md:w-1/2"
//         />

//         <select
//           value={type}
//           onChange={(e) => setType(e.target.value)}
//           className="border rounded-lg px-3 py-2 bg-card"
//         >
//           <option value="">All Types</option>
//           <option value="company">Companies</option>
//           <option value="user">Users</option>
//           <option value="task">Tasks</option>
//         </select>

//         <Button onClick={handleSearch}>Search</Button>
//       </div>

//       {/* Results */}
//       {loading && <p className="text-muted-foreground">Searching...</p>}

//       {!loading && results && !hasResults && (
//         <p className="text-muted-foreground">No results found.</p>
//       )}

//       {!loading && results && hasResults && (
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
//           {/* Companies */}
//           {results.companies?.length > 0 && (
//             <Card className="p-6 border border-border">
//               <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
//                 <Building2 className="w-6 h-6 text-primary" />
//                 Companies
//               </h3>

//               <ul className="space-y-2">
//                 {results.companies.map((c: any) => (
//                   <li key={c.id} className="border-b pb-2 border-border">
//                     <Link to={`/admin/companies/${c.id}`} className="text-primary hover:underline">
//                       {c.name}
//                     </Link>
//                     <p className="text-xs text-muted-foreground">
//                       {c.industry || "No industry"}
//                     </p>
//                   </li>
//                 ))}
//               </ul>
//             </Card>
//           )}

//           {/* Users */}
//           {results.users?.length > 0 && (
//             <Card className="p-6 border border-border">
//               <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
//                 <Users className="w-6 h-6 text-primary" />
//                 Users
//               </h3>

//               <ul className="space-y-2">
//                 {results.users.map((u: any) => (
//                   <li key={u.id} className="border-b pb-2 border-border">
//                     <span className="font-medium">
//                       {u.firstName} {u.lastName}
//                     </span>
//                     <p className="text-xs text-muted-foreground">{u.email}</p>
//                   </li>
//                 ))}
//               </ul>
//             </Card>
//           )}

//           {/* Tasks */}
//           {results.tasks?.length > 0 && (
//             <Card className="p-6 border border-border">
//               <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
//                 <Briefcase className="w-6 h-6 text-accent" />
//                 Tasks
//               </h3>

//               <ul className="space-y-2">
//                 {results.tasks.map((t: any) => (
//                   <li key={t.id} className="border-b pb-2 border-border">
//                     <span className="font-medium">{t.title}</span>
//                     <p className="text-xs text-muted-foreground">{t.description}</p>
//                   </li>
//                 ))}
//               </ul>
//             </Card>
//           )}

//         </div>
//       )}
//     </div>
//   );
// };

// export default AdminSearch;
