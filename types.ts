
export enum GarmentType {
  Auto = 'auto',
  Top = 'top',
  Bottom = 'bottom',
  Full = 'full',
}

export enum Gender {
  Woman = 'woman',
  Man = 'man',
}

export enum Pose {
  Face = 'Face',
  ThreeQuarter = 'Three-quarter pose',
  FromTheSide = 'From the side',
  Random = 'Random',
}

export enum Environment {
    Studio = 'studio',
    Street = 'street',
    Bed = 'bed',
    Beach = 'beach',
    Indoor = 'indoor',
}

export interface GeneratedImage {
  id: string;
  s3_key: string;
  url: string;
  pose: Pose | string;
  prompt: string;
}

export interface GenerationSettings {
    garmentType: GarmentType;
    gender: Gender;
    environment: Environment | string; // Can be preset or custom from Studio
    poses: (Pose | string)[];
    extraInstructions: string;
    modelReferenceType: 'image' | 'description';
    flowMode: 'classic' | 'sequential' | 'both';
}

export interface Listing {
  id: string;
  userId: string;
  sourceImage: {
      name: string;
      url: string;
  };
  settings: GenerationSettings;
  generatedImages: GeneratedImage[];
  description?: string;
  createdAt: string;
  coverImageS3Key?: string;
}

export interface StudioItem {
  id: string;
  s3_key: string;
  url: string; // This would be a presigned URL in a real app
  name?: string;
  userId: string;
}

export interface StudioEnvironment extends StudioItem {}

export interface StudioModel extends StudioItem {
  gender: Gender;
  description?: string;
}

export interface StudioPose {
    id: string;
    description: string;
    imageUrl?: string; // URL of the source image used to generate description
}

export interface AppSettings {
    defaultGender: Gender;
    defaultEnvironment: string; // name of default environment
    defaultPoses: Pose[];
    defaultFlowMode: 'classic' | 'sequential' | 'both';
    defaultModelReferenceType: 'image' | 'description';
}

export interface User {
    id: string;
    email: string;
    isAdmin: boolean;
}
