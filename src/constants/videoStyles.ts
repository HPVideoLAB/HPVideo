// $lib/constants/videoStyles.ts

export interface VideoStyle {
  id: string;
  label: string;
  value: string; // loRa path
  triggerWord: string;
  strength: number;
  scale: number;
}

export const VIDEO_STYLES: VideoStyle[] = [
  {
    id: 'none',
    label: 'Default (No Style)',
    value: '',
    triggerWord: '',
    strength: 0.5,
    scale: 0,
  },
  {
    id: 'shinkai',
    label: 'Shinkai Anime',
    value: 'Cseti/wan-14b-shinkai-anime-style-lora-v1',
    triggerWord: 'sh1nka1 animation style, anime style, highly detailed',
    strength: 0.85,
    scale: 1.0,
  },
  {
    id: 'wallace',
    label: 'Clay Stop Motion',
    value: 'Cseti/wan-14b-wallace_and_gromit-style-lora-v1',
    triggerWord: 'wallace and gromit style, claymation, stop motion',
    strength: 0.9,
    scale: 1.0,
  },
  {
    id: 'rick_morty',
    label: 'Rick and Morty Style',
    value: 'DeverStyle/rick-and-morty-style-wan-21',
    triggerWord: 'rick and morty style, flat color, cartoon',
    strength: 0.85,
    scale: 1.0,
  },
  {
    id: 'mix3d',
    label: '3D Blind Box Toy',
    value: 'Ashmotv/mix3d_style_wan-lora',
    triggerWord: 'mix3d style, 3d render, c4d, blender, cute',
    strength: 0.8,
    scale: 1.0,
  },
  {
    id: 'vector',
    label: 'Flat Vector Art',
    value: 'Ashmotv/vect0r_style_wan_v2-lora',
    triggerWord: 'vector art, flat illustration, minimal',
    strength: 0.8,
    scale: 1.0,
  },
];
