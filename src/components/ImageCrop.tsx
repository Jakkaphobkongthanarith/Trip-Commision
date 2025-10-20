import { useState, useRef, useCallback } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from "react-image-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crop as CropIcon, RotateCcw, Check, X } from "lucide-react";
import "react-image-crop/dist/ReactCrop.css";

interface ImageCropProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void;
  aspectRatio?: number; // เช่น 16/9, 4/3, 1 (สำหรับสี่เหลี่ยมจัตุรัส)
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCrop({
  src,
  isOpen,
  onClose,
  onCropComplete,
  aspectRatio = 16 / 9, // Default aspect ratio
}: ImageCropProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspectRatio) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  }

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: PixelCrop): Promise<string> => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("No 2d context");
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
      canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = "high";

      const cropX = crop.x * scaleX;
      const cropY = crop.y * scaleY;

      const centerX = image.naturalWidth / 2;
      const centerY = image.naturalHeight / 2;

      ctx.save();

      // 5) Move the crop origin to the canvas origin (0,0)
      ctx.translate(-cropX, -cropY);
      // 4) Move the origin to the center of the original position
      ctx.translate(centerX, centerY);
      // 3) Rotate around the origin
      ctx.rotate((rotate * Math.PI) / 180);
      // 2) Scale the image
      ctx.scale(scale, scale);
      // 1) Move the center of the image to the origin (0,0)
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(image, 0, 0);
      ctx.restore();

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas is empty"));
              return;
            }
            const url = URL.createObjectURL(blob);
            resolve(url);
          },
          "image/jpeg",
          0.95
        );
      });
    },
    [scale, rotate]
  );

  const handleCropComplete = useCallback(async () => {
    if (completedCrop && imgRef.current) {
      try {
        const croppedImageUrl = await getCroppedImg(
          imgRef.current,
          completedCrop
        );
        onCropComplete(croppedImageUrl);
        onClose();
      } catch (error) {
        console.error("Error cropping image:", error);
      }
    }
  }, [completedCrop, getCroppedImg, onCropComplete, onClose]);

  const resetCrop = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
    setScale(1);
    setRotate(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" />
            ปรับแต่งรูปภาพ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Control Panel */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">ขนาด:</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">หมุน:</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={rotate}
                  onChange={(e) => setRotate(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {rotate}°
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={resetCrop}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              รีเซ็ต
            </Button>
          </div>

          {/* Crop Area */}
          <div className="flex justify-center max-h-[60vh] overflow-auto">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              minHeight={50}
              className="max-h-full"
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={src}
                style={{
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  maxHeight: "500px",
                  maxWidth: "100%",
                }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>

          {/* Preview Canvas (hidden) */}
          <canvas
            ref={previewCanvasRef}
            style={{
              display: "none",
              border: "1px solid black",
              objectFit: "contain",
              width: 150,
              height: 150,
            }}
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              ยกเลิก
            </Button>
            <Button
              onClick={handleCropComplete}
              disabled={!completedCrop}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              ใช้รูปภาพนี้
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}