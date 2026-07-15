-- Usunięcie pola „nazwa cyklu” (seriesName) z wydarzeń.
--
-- Powód: pole było wypełniane przez administratora, ale NIC go nie czytało — nie grupowało,
-- nie filtrowało i nigdy nie pojawiało się na stronie. Audyt wskazał je jako jedyne realnie
-- zbędne pole modelu. Trzymanie martwej kolumny to dług: przy każdej zmianie trzeba o niej
-- pamiętać, a nie daje nic w zamian.
--
-- Gdy grupowanie wydarzeń w cykle (np. „Akademia Spedytora — 4 spotkania”) okaże się realnie
-- potrzebne, pole wróci razem z funkcją, która faktycznie z niego korzysta.
ALTER TABLE "Event" DROP COLUMN "seriesName";
