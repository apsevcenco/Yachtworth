declare module "*.mp4" {
  const asset: number;
  export default asset;
}

declare module "*.svg" {
  const asset: number;
  export default asset;
}

declare module "qrcode" {
  type ToStringOptions = {
    type?: "svg";
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  };

  const QRCode: {
    toString(text: string, options?: ToStringOptions): Promise<string>;
  };

  export default QRCode;
}
