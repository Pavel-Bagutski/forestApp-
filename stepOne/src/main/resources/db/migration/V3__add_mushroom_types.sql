-- Создание таблицы типов грибов (если не существует)
CREATE TABLE IF NOT EXISTS mushroom_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    image_url VARCHAR(1000),
    description TEXT
);

-- Добавление колонки в места (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mushroom_places' AND column_name = 'mushroom_type_id'
    ) THEN
        ALTER TABLE mushroom_places
        ADD COLUMN mushroom_type_id BIGINT REFERENCES mushroom_types(id);
    END IF;
END $$;

-- Индекс для быстрого поиска (если не существует)
CREATE INDEX IF NOT EXISTS idx_mushroom_places_type ON mushroom_places(mushroom_type_id);

-- Начальные данные: типы грибов (INSERT IGNORE аналог)
INSERT INTO mushroom_types (name, image_url, description)
VALUES
('Белый гриб', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Boletus_edulis_%28Tottoli%29.jpg/640px-Boletus_edulis_%28Tottoli%29.jpg', 'Царь грибов, самый ценный и вкусный'),
('Подберёзовик', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Leccinum_scabrum_%28Schaeff.%29_Singer_580051.jpg/640px-Leccinum_scabrum_%28Schaeff.%29_Singer_580051.jpg', 'Растёт под берёзами, отличный вкус'),
('Лисички', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Chanterelle_Cantharellus_cibarius.jpg/640px-Chanterelle_Cantharellus_cibarius.jpg', 'Ярко-жёлтые, неперепутываемые грибы'),
('Подосиновик', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Leccinum_aurantiacum_%28Schaeff.%29_Singer_580055.jpg/640px-Leccinum_aurantiacum_%28Schaeff.%29_Singer_580055.jpg', 'Красная шляпка, растёт под осинами'),
('Сыроежка', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Russula_vesca_%28xndr%29.jpg/640px-Russula_vesca_%28xndr%29.jpg', 'Хрупкие грибы с ломкой ножкой')
ON CONFLICT (name) DO NOTHING;