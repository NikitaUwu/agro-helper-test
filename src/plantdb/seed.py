"""Database seeder for the 4-table PlantDB schema."""

from typing import Dict, List
from sqlalchemy.orm import Session

from plantdb.models import DiseaseClass, Source
from plantdb.registry import additional_conditions


SEED_SOURCES = [
    {
        "id": "plantvillage",
        "name": "PlantVillage Dataset",
        "url": "https://huggingface.co/datasets/mohanty/PlantVillage",
        "license_type": "CC BY-SA 3.0",
        "attribution": "David P. Hughes, Marcel Salathé (Penn State University)",
        "can_display": True,
        "can_use_for_eval": True,
    },
    {
        "id": "mendeley",
        "name": "Mendeley Data Plant Pathology",
        "url": "https://data.mendeley.com/",
        "license_type": "CC BY 4.0",
        "attribution": "Huang et al. / Bell et al. (Mendeley Data)",
        "can_display": True,
        "can_use_for_eval": True,
    },
    {
        "id": "eppo",
        "name": "EPPO Global Database",
        "url": "https://data.eppo.int/",
        "license_type": "Open Data Licence",
        "attribution": "European and Mediterranean Plant Protection Organization (EPPO)",
        "can_display": True,
        "can_use_for_eval": True,
    },
]

SEED_CLASSES = [
    # Томат (Tomato)
    {
        "id": "tomato_healthy",
        "crop": "Томат",
        "crop_en": "Tomato",
        "disease_name": "Здоровый лист",
        "disease_name_en": "Healthy Leaf",
        "is_healthy": True,
        "description": "Листовая пластинка ровная, равномерного зелёного цвета без пятен, некрозов и деформаций.",
        "treatment_recommendations": "Регулярный полив, сбалансированное минеральное питание (NPK + микроэлементы).",
    },
    {
        "id": "tomato_early_blight",
        "crop": "Томат",
        "crop_en": "Tomato",
        "disease_name": "Альтернариоз (сухая пятнистость)",
        "disease_name_en": "Early Blight",
        "is_healthy": False,
        "description": "Сухие тёмно-коричневые округлые пятна с концентрическими кольцами («мишень»), чаще на нижних листьях.",
        "treatment_recommendations": "Обработка фунгицидами меди, азоксистробином или манкоцебом; удаление поражённых нижних листьев.",
    },
    {
        "id": "tomato_late_blight",
        "crop": "Томат",
        "crop_en": "Tomato",
        "disease_name": "Фитофтороз",
        "disease_name_en": "Late Blight",
        "is_healthy": False,
        "description": "Крупные водянистые серо-бурые пятна с беловатым пушистым налётом спороношения на нижней стороне листа.",
        "treatment_recommendations": "Профилактические и лечебные обработки (мандипропамид, диметоморф, металаксил); снижать влажность в теплицах.",
    },
    {
        "id": "tomato_septoria_leaf_spot",
        "crop": "Томат",
        "crop_en": "Tomato",
        "disease_name": "Септориоз (белая пятнистость)",
        "disease_name_en": "Septoria Leaf Spot",
        "is_healthy": False,
        "description": "Многочисленные мелкие округлые пятна со светлым центром и тёмной каймой, с мелкими чёрными точками пикнид внутри.",
        "treatment_recommendations": "Применение хлорокиси меди, дифеноконазола; уничтожение растительных остатков.",
    },
    {
        "id": "tomato_yellow_leaf_curl",
        "crop": "Томат",
        "crop_en": "Tomato",
        "disease_name": "Вирус жёлтой курчавости листьев",
        "disease_name_en": "Tomato Yellow Leaf Curl Virus",
        "is_healthy": False,
        "description": "Хлороз (пожелтение) краёв листьев, деформация, скручивание кверху и измельчение верхушечных побегов.",
        "treatment_recommendations": "Борьба с переносчиком — табачной белокрылкой (инсектициды, жёлтые клеевые ловушки); использование устойчивых гибридов.",
    },
    # Картофель (Potato)
    {
        "id": "potato_healthy",
        "crop": "Картофель",
        "crop_en": "Potato",
        "disease_name": "Здоровый куст",
        "disease_name_en": "Healthy Plant",
        "is_healthy": True,
        "description": "Листья насыщенно-зелёные, тургор нормальный, признаки поражения вредителями и патогенами отсутствуют.",
        "treatment_recommendations": "Окучивание, соблюдение водного режима и профилактика вредителей.",
    },
    {
        "id": "potato_early_blight",
        "crop": "Картофель",
        "crop_en": "Potato",
        "disease_name": "Альтернариоз картофеля",
        "disease_name_en": "Early Blight",
        "is_healthy": False,
        "description": "Коричневые зональные пятна на долях листа, листья преждевременно желтеют и засыхают.",
        "treatment_recommendations": "Опрыскивание контактно-системными фунгицидами при появлении первых пятен.",
    },
    {
        "id": "potato_late_blight",
        "crop": "Картофель",
        "crop_en": "Potato",
        "disease_name": "Фитофтороз картофеля",
        "disease_name_en": "Late Blight",
        "is_healthy": False,
        "description": "Быстро разрастающиеся бурые пятна на ботве, белый налёт во влажную погоду, гибель ботвы за считанные дни.",
        "treatment_recommendations": "Превентивные обработки фунгицидами по сигнализации прогноза фитофтороза.",
    },
    {
        "id": "potato_black_scurf",
        "crop": "Картофель",
        "crop_en": "Potato",
        "disease_name": "Ризоктониоз (чёрная парша)",
        "disease_name_en": "Black Scurf",
        "is_healthy": False,
        "description": "Твёрдые чёрные коростинки (склероции) на клубнях, язвы на подземных стеблях и столонах.",
        "treatment_recommendations": "Протравливание семенных клубней перед посадкой, соблюдение севооборота.",
    },
    {
        "id": "potato_common_scab",
        "crop": "Картофель",
        "crop_en": "Potato",
        "disease_name": "Обыкновенная парша",
        "disease_name_en": "Common Scab",
        "is_healthy": False,
        "description": "Неглубокие шелушащиеся язвочки и трещины на кожуре клубней.",
        "treatment_recommendations": "Поддержание слабокислой реакции почвы (pH 5.2–5.8), полив в период клубнеобразования.",
    },
    # Огурец (Cucumber)
    {
        "id": "cucumber_healthy",
        "crop": "Огурец",
        "crop_en": "Cucumber",
        "disease_name": "Здоровое растение",
        "disease_name_en": "Healthy Plant",
        "is_healthy": True,
        "description": "Листья равномерно окрашены, без хлорозов, некротических пятен и налётов.",
        "treatment_recommendations": "Оптимальная температура и влажность, защита от сквозняков и паутинного клеща.",
    },
    {
        "id": "cucumber_powdery_mildew",
        "crop": "Огурец",
        "crop_en": "Cucumber",
        "disease_name": "Мучнистая роса",
        "disease_name_en": "Powdery Mildew",
        "is_healthy": False,
        "description": "Белый мучнистый налёт на верхней стороне листьев, постепенно покрывающий весь лист.",
        "treatment_recommendations": "Применение препаратов серы, триазолов (пенконазол) или биопрепаратов на основе Bacillus subtilis.",
    },
    {
        "id": "cucumber_downy_mildew",
        "crop": "Огурец",
        "crop_en": "Cucumber",
        "disease_name": "Пероноспороз (ложная мучнистая роса)",
        "disease_name_en": "Downy Mildew",
        "is_healthy": False,
        "description": "Угловатые жёлтые пятна, ограниченные жилками листа; с нижней стороны — серо-фиолетовый налёт.",
        "treatment_recommendations": "Обработка препаратами на основе пропамокарба, цимоксанила или меди.",
    },
    {
        "id": "cucumber_anthracnose",
        "crop": "Огурец",
        "crop_en": "Cucumber",
        "disease_name": "Антракноз (медянка)",
        "disease_name_en": "Anthracnose",
        "is_healthy": False,
        "description": "Жёлто-бурые округлые пятна, которые растрескиваются, образуя сквозные отверстия на листьях и язвы на плодах.",
        "treatment_recommendations": "Обработка бордоской смесью или коллоидной серой, дезинфекция теплиц.",
    },
    {
        "id": "cucumber_angular_leaf_spot",
        "crop": "Огурец",
        "crop_en": "Cucumber",
        "disease_name": "Угловатая пятнистость (бактериоз)",
        "disease_name_en": "Angular Leaf Spot",
        "is_healthy": False,
        "description": "Маслянистые угловатые пятна, ограниченные жилками листа; на нижней стороне выступают капли экссудата.",
        "treatment_recommendations": "Медьсодержащие препараты, обеззараживание семян, снижение влажности воздуха.",
    },
    # Яблоня (Apple)
    {
        "id": "apple_healthy",
        "crop": "Яблоня",
        "crop_en": "Apple",
        "disease_name": "Здоровый лист/плод",
        "disease_name_en": "Healthy Leaf/Fruit",
        "is_healthy": True,
        "description": "Листовая пластинка чистая, глянцевая, плоды гладкие без дефектов и парши.",
        "treatment_recommendations": "Своевременная санитарная обрезка кроны, подкормка микроэлементами.",
    },
    {
        "id": "apple_scab",
        "crop": "Яблоня",
        "crop_en": "Apple",
        "disease_name": "Парша яблони",
        "disease_name_en": "Apple Scab",
        "is_healthy": False,
        "description": "Оливково-бурые бархатистые пятна на листьях, растрескивание и опробковение плодов.",
        "treatment_recommendations": "Искореняющие обработки мочевиной осенью, фунгициды (дифеноконазол, ципродинил) весной.",
    },
    {
        "id": "apple_black_rot",
        "crop": "Яблоня",
        "crop_en": "Apple",
        "disease_name": "Чёрная гниль (рак)",
        "disease_name_en": "Black Rot",
        "is_healthy": False,
        "description": "Красновато-коричневые пятна на листьях типа «лягушачий глаз», чернеющие и мумифицирующиеся плоды.",
        "treatment_recommendations": "Вырезка и сжигание поражённых ветвей, зачистка коры и обработка 3% медным купоросом.",
    },
    {
        "id": "apple_cedar_rust",
        "crop": "Яблоня",
        "crop_en": "Apple",
        "disease_name": "Ржавчина яблони",
        "disease_name_en": "Cedar Apple Rust",
        "is_healthy": False,
        "description": "Ярко-оранжевые или ржавые округлые выпуклые пятна с мелкими чёрными точками на верхней стороне листа.",
        "treatment_recommendations": "Удаление посадок можжевельника поблизости, обработки препаратами миклобутанила или триазолами.",
    },
    {
        "id": "apple_powdery_mildew",
        "crop": "Яблоня",
        "crop_en": "Apple",
        "disease_name": "Мучнистая роса яблони",
        "disease_name_en": "Powdery Mildew",
        "is_healthy": False,
        "description": "Беловато-серый войлочный налёт на побегах и молодых листьях, побеги деформируются и засыхают.",
        "treatment_recommendations": "Обрезка поражённых верхушек побегов, обработки серосодержащими препаратами или топазом.",
    },
    # Пшеница (Wheat)
    {
        "id": "wheat_healthy",
        "crop": "Пшеница",
        "crop_en": "Wheat",
        "disease_name": "Здоровый стебель/колос",
        "disease_name_en": "Healthy Plant",
        "is_healthy": True,
        "description": "Стебли и колосья ровного зелёного цвета, без пустул ржавчины и пятнистостей.",
        "treatment_recommendations": "Соблюдение норм высева, защита от корневых гнилей и внесение фосфорно-калийных удобрений.",
    },
    {
        "id": "wheat_stripe_rust",
        "crop": "Пшеница",
        "crop_en": "Wheat",
        "disease_name": "Жёлтая (полосатая) ржавчина",
        "disease_name_en": "Stripe Rust",
        "is_healthy": False,
        "description": "Лимонно-жёлтые пустулы, расположенные длинными параллельными цепочками (полосками) вдоль жилок листа.",
        "treatment_recommendations": "Своевременная фунгицидная обработка по флаговому листу препаратами триазолов и стробилуринов.",
    },
    {
        "id": "wheat_leaf_rust",
        "crop": "Пшеница",
        "crop_en": "Wheat",
        "disease_name": "Бурая листовая ржавчина",
        "disease_name_en": "Leaf Rust",
        "is_healthy": False,
        "description": "Хаотично разбросанные круглые коричневые пустулы, пылящие спорами на верхней поверхности листа.",
        "treatment_recommendations": "Фунгицидная защита в фазу кущения — колошения, возделывание устойчивых сортов.",
    },
    {
        "id": "wheat_powdery_mildew",
        "crop": "Пшеница",
        "crop_en": "Wheat",
        "disease_name": "Мучнистая роса пшеницы",
        "disease_name_en": "Powdery Mildew",
        "is_healthy": False,
        "description": "Белый ватообразный налёт на нижних листьях и стебле, постепенно буреющий с образованием клейстотециев.",
        "treatment_recommendations": "Оптимизация азотного питания (избегать избытка азота), обработка морфолинами или триазолами.",
    },
    {
        "id": "wheat_septoria_tritici_blotch",
        "crop": "Пшеница",
        "crop_en": "Wheat",
        "disease_name": "Септориоз пшеницы",
        "disease_name_en": "Septoria Tritici Blotch",
        "is_healthy": False,
        "description": "Продолговатые светло-коричневые пятна с многочисленными чёрными пикнидами внутри, усыхание флагового листа.",
        "treatment_recommendations": "Двукратная фунгицидная защита (триазолы + стробилурины) в период вегетации.",
    },
]


SEED_CLASSES.extend({
    'id': condition['id'],
    'crop': condition['cropNameRu'],
    'crop_en': {'tomato': 'Tomato', 'pepper': 'Bell Pepper', 'strawberry': 'Strawberry'}[condition['cropId']],
    'disease_name': condition['nameRu'],
    'disease_name_en': condition['nameEn'],
    'is_healthy': condition.get('isHealthy', False),
    'description': condition['summaryRu'],
    'treatment_recommendations': '\n'.join(condition['recommendations']['agrotechnical'] + condition['recommendations']['chemical']),
} for condition in additional_conditions())


def seed_database(session: Session) -> tuple[int, int]:
    """Seed classes and open sources into the database.

    Returns (sources_added, classes_added).
    """
    sources_added = 0
    for src in SEED_SOURCES:
        if not session.query(Source).filter_by(id=src["id"]).first():
            session.add(Source(**src))
            sources_added += 1

    classes_added = 0
    for cls in SEED_CLASSES:
        if not session.query(DiseaseClass).filter_by(id=cls["id"]).first():
            session.add(DiseaseClass(**cls))
            classes_added += 1

    session.commit()
    return sources_added, classes_added
