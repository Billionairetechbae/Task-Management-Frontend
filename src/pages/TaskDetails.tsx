import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Send, X } from "lucide-react";
import { Link } from "react-router-dom";

const TaskDetails = () => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">Task Details: Prepare Q4 Board Presentation</h2>
            <Badge className="bg-info text-info-foreground">In Progress</Badge>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <X className="w-5 h-5" />
            </Link>
          </Button>
        </div>

        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Time Logged: 4 hours 32 mins</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="font-semibold mb-4">Activity Feed</h3>

          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="max-w-[80%]">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md p-4">
                  <p className="text-sm mb-1 opacity-80">You 10:30 AM</p>
                  <p>Please ensure the presentation includes our latest Q4 metrics.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-start">
              <div className="max-w-[80%]">
                <div className="bg-muted rounded-2xl rounded-tl-md p-4">
                  <p className="text-sm mb-1 text-muted-foreground">Assistant 10:45 AM</p>
                  <p>
                    Understood. I've gathered the Q4 data and will incorporate it into slides 5-8.
                    Should I include the regional breakdown?
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="max-w-[80%]">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md p-4">
                  <p className="text-sm mb-1 opacity-80">You 11:02 AM</p>
                  <p>
                    Yes, please include the regional breakdown. Focus on North America and EMEA.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-start">
              <div className="max-w-[80%]">
                <div className="bg-muted rounded-2xl rounded-tl-md p-4">
                  <p className="text-sm mb-1 text-muted-foreground">Assistant 11:15 AM</p>
                  <p>Working on it now. I'll have the draft ready for your review by 3 PM today.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border">
          <div className="flex gap-3">
            <Textarea
              placeholder="Type follow-up note here..."
              className="resize-none flex-1"
              rows={1}
            />
            <Button className="px-6">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;
