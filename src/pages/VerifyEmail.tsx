import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { CheckCircle2, XCircle } from "lucide-react";

const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState<"loading"|"success"|"error">("loading");
  const [message, setMessage] = useState("");

    useEffect(() => {
    const verify = async () => {
        try {
        const res = await api.request<{
            status: string;
            message: string;
        }>(`/auth/verify-email/${token}`, { method: "GET" });

        setStatus("success");
        setMessage(res.message);

        } catch (err) {
        const errorMessage =
            err instanceof Error ? err.message : "Verification failed";

        setStatus("error");
        setMessage(errorMessage);
        }
    };

    verify();
    }, [token]);


  return (
    <div className="min-h-screen flex items-center justify-center flex-col">
      {status === "loading" && <p>Verifying email...</p>}

      {status === "success" && (
        <>
          <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
          <p className="text-muted-foreground mb-4">{message}</p>
          <Link to="/" className="text-primary underline">Click here to login</Link>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
          <p className="text-muted-foreground mb-4">{message}</p>
          <Link to="/" className="text-primary underline">Back to Login</Link>
        </>
      )}
    </div>
  );
};

export default VerifyEmail;
