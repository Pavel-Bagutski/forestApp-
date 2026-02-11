-- Создание таблицы типов грибов
CREATE TABLE mushroom_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latin_name VARCHAR(100),
    category VARCHAR(50) NOT NULL,
    icon_url VARCHAR(1000)
);

-- Создание связующей таблицы многие-ко-многим
CREATE TABLE place_mushroom_types (
    place_id BIGINT NOT NULL,
    mushroom_type_id BIGINT NOT NULL,
    PRIMARY KEY (place_id, mushroom_type_id),
    FOREIGN KEY (place_id) REFERENCES mushroom_places(id) ON DELETE CASCADE,
    FOREIGN KEY (mushroom_type_id) REFERENCES mushroom_types(id) ON DELETE CASCADE
);

-- Добавление индексов для производительности
CREATE INDEX idx_place_mushroom_types_place ON place_mushroom_types(place_id);
CREATE INDEX idx_place_mushroom_types_type ON place_mushroom_types(mushroom_type_id);

-- Вставка начальных данных (популярные грибы Беларуси)
INSERT INTO mushroom_types (name, latin_name, category) VALUES
('Белый гриб', 'Boletus edulis', 'EDIBLE'),
('Подберёзовик', 'Leccinum scabrum', 'EDIBLE'),
('Подосиновик', 'Leccinum aurantiacum', 'EDIBLE'),
('Лисички', 'Cantharellus cibarius', 'EDIBLE'),
('Опята', 'Armillaria mellea', 'EDIBLE'),
('Маслята', 'Suillus luteus', 'EDIBLE'),
('Сыроежки', 'Russula', 'EDIBLE'),
('Грузди', 'Lactarius', 'CONDITIONALLY_EDIBLE'),
('Волнушки', 'Lactarius torminosus', 'CONDITIONALLY_EDIBLE'),
('Мухомор красный', 'Amanita muscaria', 'POISONOUS'),
('Бледная поганка', 'Amanita phalloides', 'POISONOUS');