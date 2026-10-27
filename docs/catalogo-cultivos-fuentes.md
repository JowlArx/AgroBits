# Catálogo de cultivos: fuentes de los valores predeterminados

> Estado: borrador de trabajo (27/10/2026). No se carga en la base hasta validarlo con una fuente local (INTA o agrónomo).

## Fuentes aprobadas (JowlArx, 27/10/2026)

| Variable | Fuente | Estado |
|---|---|---|
| Temperatura y lluvia | FAO EcoCrop, vía portal GAEZ v4 (https://gaez.fao.org/pages/ecocrop) | Extraída (esta tabla) |
| Humedad relativa | FAO (manual técnico) y extensión universitaria | Pendiente |
| pH del suelo | Extensión universitaria (Universidad de Florida, IFAS) | Pendiente |
| Humedad del suelo | FAO-56 (riego), según tipo de suelo | Pendiente |
| Luminosidad | Pendiente de decidir (lux o DLI) | Pendiente |
| Validación local | INTA o agrónomo | Pendiente |

## Procedencia de los datos de temperatura

- Archivo: `EcoCrop_DB.csv` del repositorio público `OpenCLIM/ecocrop` (copia de la base FAO EcoCrop, 2.568 especies), descargado el 27/10/2026.
- Búsqueda por nombre científico. Cuando el nombre actual no aparece, se usó el sinónimo que la base registra en su columna de nombres (Tomate → *Lycopersicon esculentum*; Rúcula → *Eruca sativa*; Lechuga → *Lactuca sativa* var. *capitata*).
- Óptimo = `TOPMN`–`TOPMX`. Absoluto = `TMIN`–`TMAX`. Unidades: °C.
- Los valores no están comprobados contra el portal FAO.

## Tabla de temperatura

| Grupo | Cultivo | Nombre científico (EcoCrop) | Óptimo °C | Absoluto °C | EcoPortCode | Observación |
|---|---|---|---|---|---|---|
| Hoja | Lechuga | *Lactuca sativa* var. *capitata* | 12–21 | 5–30 | 1313 | 3 registros; se usó el primero |
| Hoja | Acelga | *Beta vulgaris* | 15–25 | 4–35 | 514 | Mismo registro que remolacha |
| Hoja | Espinaca | *Spinacia oleracea* | 13–20 | 2–27 | 1997 | |
| Hoja | Rúcula | *Eruca sativa* | 15–25 | 8–29 | 5794 | Sinónimo de *Eruca vesicaria* |
| Hoja | Radicheta | *Cichorium intybus* | 10–30 | 6–35 | 694 | La base no separa variedades |
| Hoja | Achicoria | *Cichorium endivia* | 15–23 | 5–30 | 693 | |
| Hoja | Perejil | *Petroselinum crispum* | 11–20 | 7–28 | 1661 | |
| Hoja | Cebolla de verdeo | *Allium fistulosum* | 12–25 | 6–30 | 365 | |
| Hoja | Cilantro | *Coriandrum sativum* | 15–25 | 4–32 | 784 | |
| Fruto | Tomate | *Lycopersicon esculentum* | 20–27 | 7–35 | 1379 | Nombre antiguo de *Solanum lycopersicum* |
| Fruto | Pimiento | *Capsicum annuum* | 17–30 | 8–35 | 618 | |
| Fruto | Zapallito de tronco | *Cucurbita pepo* | 17–30 | 6–40 | 821 | Mismo registro que calabacín |
| Fruto | Calabacín | *Cucurbita pepo* | 17–30 | 6–40 | 821 | No se distingue de zapallito |
| Fruto | Zapallo anco / Coquena | *Cucurbita maxima* | 20–30 | 9–38 | 819 | Mismo registro que zapallo plomo |
| Fruto | Zapallo cabutiá | *Cucurbita moschata* | 20–30 | 10–40 | 820 | |
| Fruto | Zapallo plomo | *Cucurbita maxima* | 20–30 | 9–38 | 819 | No se distingue de anco |
| Fruto | Berenjena | *Solanum melongena* | 20–35 | 9–40 | 1965 | |
| Raíz/bulbo | Zanahoria | *Daucus carota* | 15–24 | 3–30 | 871 | |
| Raíz/bulbo | Remolacha | *Beta vulgaris* | 15–25 | 4–35 | 514 | Mismo registro que acelga |
| Raíz/bulbo | Cebolla | *Allium cepa* | 12–25 | 4–30 | 364 | |
| Raíz/bulbo | Ajo | *Allium sativum* | 18–30 | 7–35 | 367 | |
| Raíz/bulbo | Rábano | *Raphanus sativus* | 12–26 | 10–37 | 1839 | |
| Frutas/aromáticas | Frutilla | *Fragaria* x *ananassa* | 11–24 | 6–28 | 1112 | |
| Frutas/aromáticas | Orégano | *Origanum vulgare* | 17–28 | 4–32 | 2369 | |
| Frutas/aromáticas | Romero | *Rosmarinus officinalis* | 18–30 | 8–38 | 9326 | |
| Frutas/aromáticas | Tomillo | *Thymus vulgaris* | 16–25 | 4–30 | 2441 | |
| Frutas/aromáticas | Albahaca | *Ocimum basilicum* | 18–27 | 7–36 | 1547 | |
| Frutas/aromáticas | Menta | Sin registro confiable | — | — | — | La base solo tiene *Mentha arvensis* var. *piperascens* (menta japonesa). No se usa |
| Frutales | Ciruelo | *Prunus domestica* | 18–33 | 6–36 | 16203 | |
| Frutales | Duraznero | *Prunus persica* | 20–33 | 7–35 | 1796 | |
| Frutales | Higuera | *Ficus carica* | 16–26 | 4–38 | 1071 | |
| Frutales | Manzano | *Malus domestica* | 14–27 | 8–33 | 1407 | |
| Frutales | Naranjo (cítricos) | *Citrus sinensis* | 20–30 | 13–38 | 720 | |
| Frutales | Limonero (cítricos) | *Citrus limon* | 15–28 | 12–36 | 714 | |

## Comparación con los 4 cultivos ya cargados

| Cultivo | Catálogo actual °C | EcoCrop óptimo °C | EcoCrop absoluto °C |
|---|---|---|---|
| Tomate | 15–28 | 20–27 | 7–35 |
| Lechuga | 10–22 | 12–21 | 5–30 |
| Albahaca | 18–30 | 18–27 | 7–36 |
| Pimiento | 16–30 | 17–30 | 8–35 |

Los valores actuales se parecen al óptimo de EcoCrop, pero no tienen cita. Hay que reemplazarlos o confirmarlos con la fuente.

## Limitaciones

- EcoCrop solo cubre temperatura y lluvia. Humedad relativa, pH, humedad del suelo y luz quedan pendientes.
- Varias especies comparten registro (zapallitos y calabacín; zapallo anco y plomo; acelga y remolacha). La base no distingue esas variedades.
- Los frutales se describen por clima de crecimiento. La base no contempla heladas ni floración; hay que revisarlos con fuente local.
- Los valores son de un modelo climático global. Un cultivo en invernadero o con riego puede tener rangos distintos.
