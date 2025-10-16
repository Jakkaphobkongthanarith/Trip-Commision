import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PDFViewerProps {
  pdfUrl: string;
  title?: string;
}

export const PDFViewer = ({
  pdfUrl,
  title = "เอกสารแพคเกจ",
}: PDFViewerProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "ดาวน์โหลดสำเร็จ",
        description: "ไฟล์ PDF ถูกดาวน์โหลดแล้ว",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "ไม่สามารถดาวน์โหลดได้",
        description: "กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  };

  const openInNewTab = () => {
    window.open(pdfUrl, "_blank");
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button onClick={openInNewTab} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              เปิดในแท็บใหม่
            </Button>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              ดาวน์โหลด PDF
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative w-full h-[600px] border rounded-lg bg-muted/30 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground animate-pulse" />
                <p className="text-muted-foreground">กำลังโหลด PDF...</p>
              </div>
            </div>
          )}

          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            width="100%"
            height="100%"
            title={title}
            className="border-0"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              toast({
                title: "ไม่สามารถโหลด PDF",
                description: "กรุณาลองดาวน์โหลดไฟล์แทน",
                variant: "destructive",
              });
            }}
          />

          {/* Fallback for browsers that don't support iframe PDF viewing */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 hover:opacity-100 transition-opacity">
            <div className="text-center p-6 bg-background border rounded-lg shadow-lg">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                ไม่สามารถแสดง PDF ในเบราว์เซอร์
              </h3>
              <p className="text-muted-foreground mb-4">
                กรุณาดาวน์โหลดหรือเปิดในแท็บใหม่
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={openInNewTab} variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  เปิดในแท็บใหม่
                </Button>
                <Button onClick={handleDownload} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  ดาวน์โหลด
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
