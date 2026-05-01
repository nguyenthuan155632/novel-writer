export const TONES = [
  { slug: 'serious',  viLabel: 'Nghiêm túc' },
  { slug: 'humorous', viLabel: 'Hài hước' },
  { slug: 'dark',     viLabel: 'U tối' },
  { slug: 'tragic',   viLabel: 'Bi tráng' },
  { slug: 'soft',     viLabel: 'Nhẹ nhàng' },
] as const;

export const PACINGS = [
  { slug: 'slow',         viLabel: 'Chậm chắc' },
  { slug: 'medium',       viLabel: 'Vừa phải' },
  { slug: 'fast',         viLabel: 'Nhanh' },
  { slug: 'climax_heavy', viLabel: 'Liên tục cao trào' },
] as const;

export const MAIN_CONFLICT_TYPES = [
  { slug: 'revenge',        viLabel: 'Báo thù' },
  { slug: 'survival',       viLabel: 'Sinh tồn' },
  { slug: 'power_struggle', viLabel: 'Tranh quyền' },
  { slug: 'mystery',        viLabel: 'Khám phá bí mật' },
  { slug: 'growth',         viLabel: 'Trưởng thành' },
] as const;

export const POWER_SYSTEM_STYLES = [
  { slug: 'realm',   viLabel: 'Cảnh giới' },
  { slug: 'level',   viLabel: 'Cấp độ' },
  { slug: 'skill',   viLabel: 'Kỹ năng' },
  { slug: 'ability', viLabel: 'Dị năng' },
  { slug: 'martial', viLabel: 'Võ học' },
  { slug: 'tech',    viLabel: 'Công nghệ' },
] as const;

export const WORLD_ERAS = [
  { slug: 'ancient',         viLabel: 'Cổ đại' },
  { slug: 'modern',          viLabel: 'Hiện đại' },
  { slug: 'future',          viLabel: 'Tương lai' },
  { slug: 'otherworld',      viLabel: 'Dị giới' },
  { slug: 'post_apocalypse', viLabel: 'Hậu tận thế' },
] as const;

export const ROMANCE_LEVELS = [
  { slug: 'none',   viLabel: 'Không có' },
  { slug: 'light',  viLabel: 'Nhẹ' },
  { slug: 'medium', viLabel: 'Vừa' },
  { slug: 'heavy',  viLabel: 'Nhiều' },
] as const;

export const COMEDY_LEVELS = [
  { slug: 'none',   viLabel: 'Không' },
  { slug: 'light',  viLabel: 'Nhẹ' },
  { slug: 'medium', viLabel: 'Vừa' },
  { slug: 'heavy',  viLabel: 'Nhiều' },
] as const;

export const DARK_LEVELS = [
  { slug: 'bright',       viLabel: 'Sáng' },
  { slug: 'neutral',      viLabel: 'Trung tính' },
  { slug: 'dark',         viLabel: 'U tối' },
  { slug: 'extreme_dark', viLabel: 'Cực dark' },
] as const;

export const POVS = [
  { slug: 'third_limited',    viLabel: 'Ngôi ba giới hạn' },
  { slug: 'third_omniscient', viLabel: 'Ngôi ba toàn tri' },
  { slug: 'first',            viLabel: 'Ngôi nhất' },
] as const;

export const MORALITIES = [
  { slug: 'righteous', viLabel: 'Chính đạo' },
  { slug: 'pragmatic', viLabel: 'Thực dụng' },
  { slug: 'antihero',  viLabel: 'Phản anh hùng' },
  { slug: 'villain',   viLabel: 'Phản diện' },
] as const;
