-- packages/db/migrations/0012_genre_personality.sql

ALTER TABLE stories
  ADD COLUMN main_character_personality text NOT NULL DEFAULT 'tram_on';

ALTER TABLE stories
  ADD COLUMN genre_locked_at timestamptz NULL;

ALTER TABLE stories
  ALTER COLUMN genre SET DEFAULT 'tien_hiep';

UPDATE stories SET genre = 'tien_hiep' WHERE genre = 'xianxia_fantasy';

UPDATE stories
  SET genre = 'tuy_chon'
  WHERE genre NOT IN (
    'tien_hiep','huyen_huyen','vo_thuat','cao_vo','do_thi','di_nang','mat_the',
    'khoa_huyen','kiem_hiep','tu_chan','di_gioi','he_thong','trong_sinh',
    'xuyen_khong','lich_su_gia_tuong','cung_dau','linh_di','trinh_tham',
    'quan_su','tay_huyen','dong_phuong_huyen_bi','vong_du','hac_am_fantasy',
    'do_thi_tu_tien','do_thi_di_nang','tuy_chon'
  );

UPDATE stories s SET genre_locked_at = NOW()
  WHERE EXISTS (SELECT 1 FROM story_bibles b WHERE b.story_id = s.id);
