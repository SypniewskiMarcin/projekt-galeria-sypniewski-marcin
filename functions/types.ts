export type WatermarkSettings = {
    type: 'text' | 'image';
    text?: string;
    opacity?: number;
    isHidden?: boolean;
    position?: string;
    fontColor?: string;
};

export type ProcessImageResponse = {
    success: boolean;
    message: string;
    enhancedUrl?: string;
    error?: string;
}; 