import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdfUrl: string;
  title?: string;
}

export const PDFViewer = ({ pdfUrl, title = "เอกสารแพคเกจ" }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setIsLoading(false);
    toast({
      title: "ไม่สามารถโหลด PDF",
      description: "กรุณาลองใหม่อีกครั้งหรือดาวน์โหลดไฟล์",
      variant: "destructive",
    });
  };

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

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            ดาวน์โหลด PDF
          </Button>
        </div>

        {!isLoading && numPages > 0 && (
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              ก่อนหน้า
            </Button>
            <span className="text-sm text-muted-foreground">
              หน้า {pageNumber} / {numPages}
            </span>
            <Button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              variant="outline"
              size="sm"
            >
              ถัดไป
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[600px] w-full border rounded-lg bg-muted/30">
          <div className="flex justify-center p-4">
            {isLoading && (
              <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">กำลังโหลด PDF...</p>
              </div>
            )}
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-96">
                  <p className="text-muted-foreground">กำลังโหลด PDF...</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
                width={Math.min(window.innerWidth * 0.6, 800)}
              />
            </Document>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
