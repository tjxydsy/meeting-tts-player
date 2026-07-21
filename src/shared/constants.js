// Shared constants between main and renderer processes
const PALETTE = ['#e94560', '#0f3460', '#533483', '#e23e57', '#1a508b', '#6a4c93', '#c73a52', '#2d6baa', '#8b5cf6', '#f06292'];

const DEFAULT_SPEED = 2;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const SUPPORTED_STRUCTURES = [
  '1. { conferences_queryConferencesTextsNew_response: { paragraphList: [...] } }',
  '2. { paragraphList: [...] }',
  '3. { data: { paragraphList: [...] } }',
  '4. [...] (直接数组)',
];

module.exports = { PALETTE, DEFAULT_SPEED, SPEED_OPTIONS, SUPPORTED_STRUCTURES };
