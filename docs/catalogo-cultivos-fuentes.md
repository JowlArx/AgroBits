# Catálogo de cultivos: fuentes de los valores predeterminados

> Estado: borrador de trabajo (27/10/2026). No se carga en la base hasta validarlo con una fuente local (INTA o agrónomo).

## Fuentes aprobadas (JowlArx, 27/10/2026)

| Variable | Fuente | Estado |
|---|---|---|
| Temperatura y lluvia | FAO EcoCrop, vía portal GAEZ v4 (https://gaez.fao.org/pages/ecocrop) | Extraída (esta tabla) |
| Humedad relativa | Aportada por JowlArx (rangos de grupo; D58) | Registrada; confirmación bibliográfica pendiente |
| pH del suelo | Extensión universitaria (Universidad de Florida, IFAS) | Pendiente |
| Humedad del suelo | FAO-56 (Tablas 19 y 22) | Extraída (de este documento); banda de grupo aportada por JowlArx (D58) |
| Luminosidad | lux medido (BH1750) + DLI estimado (1 µmol/m²/s ≈ 54 lx); validación local pendiente | Implementado en la app el 27/10/2026 |
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

- EcoCrop solo cubre temperatura y lluvia. Humedad relativa queda pendiente; humedad del suelo (FAO-56) y pH ya están extraídos.
- Varias especies comparten registro (zapallitos y calabacín; zapallo anco y plomo; acelga y remolacha). La base no distingue esas variedades.
- Los frutales se describen por clima de crecimiento. La base no contempla heladas ni floración; hay que revisarlos con fuente local.
- Los valores son de un modelo climático global. Un cultivo en invernadero o con riego puede tener rangos distintos.

## pH y luz natural (FAO EcoCrop, misma base y método que la tabla de temperatura)

pH: `PHOPMN`–`PHOPMX` (óptimo) y `PHMIN`–`PHMAX` (absoluto). La luz de EcoCrop es una categoría descriptiva de demanda de sol, no un umbral de sensor; se copia en texto tal cual.

| Cultivo | pH óptimo | pH absoluto | Luz natural (EcoCrop) | EcoPortCode |
|---|---|---|---|---|
| Lechuga | 6–7 | 4.2–7.5 | cielos despejados | 1313 |
| Acelga | 6–7 | 5.5–7.5 | muy brillante – sombra ligera | 514 |
| Remolacha | 6–7 | 5.5–7.5 | muy brillante – sombra ligera | 514 |
| Espinaca | 6–7.5 | 5.3–8.3 | muy brillante – cielos despejados | 1997 |
| Rúcula | 7–8 | 6–8.5 | muy brillante – cielos despejados | 5794 |
| Radicheta | 6–7.5 | 4.5–8.3 | muy brillante – cielos despejados | 694 |
| Achicoria | 6.5–7.8 | 5.3–8.5 | cielos despejados | 693 |
| Perejil | 6–7.5 | 5.3–8.3 | cielos despejados – cielos nublados | 1661 |
| Cebolla de verdeo | 6.6–7.4 | 5.5–8.5 | cielos despejados | 365 |
| Cilantro | 5.5–7.5 | 4–8 | cielos despejados | 784 |
| Tomate | 5.5–6.8 | 5–7.5 | cielos despejados | 1379 |
| Pimiento | 5.5–6.8 | 4.5–7 | muy brillante | 618 |
| Zapallito de tronco | 5.5–6.8 | 4.5–8.3 | muy brillante | 821 |
| Calabacín | 5.5–6.8 | 4.5–8.3 | muy brillante | 821 |
| Zapallo anco / Coquena | 5.5–7.5 | 5–8.5 | muy brillante | 819 |
| Zapallo plomo | 5.5–7.5 | 5–8.5 | muy brillante | 819 |
| Zapallo cabutiá | 5.5–7.5 | 4.5–8.3 | cielos despejados | 820 |
| Berenjena | 5.5–6.8 | 4.3–8.5 | muy brillante | 1965 |
| Zanahoria | 5.8–6.8 | 4.2–8.7 | cielos despejados – cielos nublados | 871 |
| Cebolla | 6–7 | 4.3–8.3 | cielos despejados – muy brillante | 364 |
| Ajo | 6–6.6 | 5–8.5 | cielos despejados | 367 |
| Rábano | 6–7 | 4.3–8.3 | cielos despejados | 1839 |
| Frutilla | 6–6.8 | 4.5–8.2 | muy brillante – cielos despejados | 1112 |
| Orégano | 5.5–7 | 4.5–8.7 | muy brillante | 2369 |
| Romero | 6–7.5 | 4.5–8.7 | muy brillante | 9326 |
| Tomillo | 5.5–6.5 | 4.5–8 | muy brillante | 2441 |
| Albahaca | 6–7 | 4.3–8.2 | muy brillante | 1547 |
| Menta | sin registro confiable | — | — | — |
| Ciruelo | 5.5–6.1 | 4.5–7.4 | muy brillante | 16203 |
| Duraznero | 5.5–6.3 | 4.5–7.5 | muy brillante | 1796 |
| Higuera | 6–7 | 4.3–8.6 | muy brillante – sombra ligera | 1071 |
| Manzano | 6–7 | 4.5–8 | muy brillante – cielos despejados | 1407 |
| Naranjo (cítricos) | 5–6 | 4–8.3 | muy brillante | 720 |
| Limonero (cítricos) | 6.5–7 | 5.5–8 | muy brillante | 714 |

Nota: el pH del suelo real depende de la extracción de la muestra (sólido saturado). Estos rangos son de referencia y no se miden directamente en tierra. Para hoy no hay sensor de pH (postergado por decisión de JowlArx, 27/10/2026).

## Humedad del suelo (FAO-56, cap. 8)

Fuente: FAO Irrigation and Drainage Paper 56, Tabla 22 (p y Zr) y Tabla 19 (agua disponible por textura), extraídas de https://www.fao.org/4/X0490E/x0490e0e.htm el 27/10/2026.

El umbral de alerta depende del tipo de suelo de cada usuario. No se fija un % volumétrico único: se almacenan `p` y `Zr`, y la app calcula `TAW = PAW × Zr`, `RAW = p × TAW`, y `θ_alerta = θ_CC − RAW / (1000 × Zr)`.

PAW de la tabla 19 (agua disponible, mm por metro de suelo), tal como aparece en el ejemplo 36: arena franco-lojema 90, limo 170, arcilla limosa 120. Falta extraer la tabla 19 completa.

| Cultivo | Zr (m) | p | Entrada FAO-56 | Observación |
|---|---|---|---|---|
| Lechuga | 0.3–0.5 | 0.30 | «Lettuce» (hortalizas menores) | |
| Acelga | sin dato | — | — | «Swiss chard» no está en la tabla 22 |
| Espinaca | 0.3–0.5 | 0.20 | «Spinach» | |
| Rúcula | sin dato | — | — | sin entrada |
| Radicheta | sin dato | — | — | sin entrada |
| Achicoria | sin dato | — | — | sin entrada |
| Perejil | sin dato | — | — | sin entrada |
| Cebolla de verdeo | 0.3–0.6 | 0.30 | «Onions, green» | |
| Cilantro | sin dato | — | — | sin entrada |
| Tomate | 0.7–1.5 | 0.40 | «Tomato» | |
| Pimiento | 0.5–1.0 | 0.30 | «Sweet peppers (bell)» | |
| Zapallito de tronco | 0.6–1.0 | 0.50 | «Squash, zucchini» | |
| Calabacín | 0.6–1.0 | 0.50 | «Squash, zucchini» | mismo registro |
| Zapallo anco / Coquena | 1.0–1.5 | 0.35 | «Pumpkin, winter squash» | |
| Zapallo cabutiá | 1.0–1.5 | 0.35 | «Pumpkin, winter squash» | aproximo: moschata no tiene entrada propia |
| Zapallo plomo | 1.0–1.5 | 0.35 | «Pumpkin, winter squash» | mismo registro |
| Berenjena | 0.7–1.2 | 0.45 | «Egg plant» | |
| Zanahoria | 0.5–1.0 | 0.35 | «Carrots» | |
| Remolacha | 0.6–1.0 | 0.50 | «Beets, table» | ≠ azucarera (0.7–1.2, 0.55) |
| Cebolla | 0.3–0.6 | 0.30 | «Onions, dry» | |
| Ajo | 0.3–0.5 | 0.30 | «Garlic» | |
| Rábano | 0.3–0.5 | 0.30 | «Radishes» | |
| Frutilla | 0.2–0.3 | 0.20 | «Strawberries» (perennes) | |
| Orégano | sin dato | — | — | sin entrada |
| Romero | sin dato | — | — | sin entrada |
| Tomillo | sin dato | — | — | sin entrada |
| Albahaca | sin dato | — | — | sin entrada |
| Menta | 0.4–0.8 | 0.40 | «Mint» | sí está en la tabla 22, aunque no en EcoCrop |
| Ciruelo | 1.0–2.0 | 0.50 | «Apricots, peaches, stone fruit» | |
| Duraznero | 1.0–2.0 | 0.50 | «Apricots, peaches, stone fruit» | mismo registro |
| Higuera | sin dato | — | — | sin entrada |
| Manzano | 1.0–2.0 | 0.50 | «Apples, cherries, pears» | |
| Naranjo (cítricos) | 0.8–1.5 | 0.50 | «Citrus» | cubre copas del 20 al 70 % |
| Limonero (cítricos) | 0.8–1.5 | 0.50 | «Citrus» | mismo registro |

Ejemplo trabajado (tomate en suelo limo, del ejemplo 36 de FAO-56): TAW = 170 × 0.8 = 136 mm; RAW = 0.40 × 136 = 54 mm; con θ_CC = 0.32 y Zr = 0.8, θ_alerta ≈ 0.25 m³/m³ (25 % vol).

Ajustes del capítulo 8: con ETc alta el p baja 10–25 %, y con ETc baja sube hasta +20 %; en arenas el p sube 5–10 % y en arcillas baja 5–10 %.

## Rangos de grupo aportados por JowlArx (27/10/2026)

Fuente directa: valores aportados por JowlArx. Son rango por grupo: la confirmación bibliográfica por cultivo queda pendiente.

Regla de resolución aprobada (JowlArx, «Si»): la app calcula el umbral de humedad del suelo con `p` y `Zr` (FAO-56) y el tipo de suelo declarado por el usuario. Cuando el usuario no declara suelo, se usa la banda de grupo de esta sección.

| Grupo | Temp. óptima °C | HR % | Humedad de suelo (% de Capacidad de Campo) | DLI mol/m²/día |
|---|---|---|---|---|
| 1. Hoja (lechuga, acelga, espinaca, rúcula, radicheta, achicoria, perejil, cebolla de verdeo, cilantro) | 15–22 | 60–70 | 70–80 | 14–20 |
| 2. Fruto (tomate, pimiento, zapallito, calabacín, zapallos, berenjena) | 20–30 día / 15–18 noche | 50–65 | 60–75 | 22–30+ |
| 3. Raíz, tallo y bulbo (zanahoria, remolacha, cebolla, ajo, rábano) | 15–22 | 50–65 | 55–70 | 15–22 |
| 4. Frutilla y aromáticas (frutilla, orégano, romero, tomillo, albahaca, menta) | 18–25 | 40–75 | 50–80 | 18–25 |
| 5. Frutales (ciruelo, duraznero, higuera, manzano) | 15–28 (ciclo activo) | 50–70 | 60–75 | 22–35 |

Notas técnicas tal como las aportó JowlArx:
- Hoja: sobre 28 °C afecta la calidad de la hoja (espigado). Humedades extremas prolongadas favorecen mildiu. Riegos frecuentes y superficiales.
- Fruto: sensible a heladas; por debajo de 12 °C se detiene el crecimiento. HR baja durante polinización y maduración (botrytis). Altibajos hídricos en tomate: pudrición apical (pecho negro).
- Raíz/bulbo: suelo húmedo sin encharcar. Suspender el riego cerca de la cosecha de cebolla y ajo para el curado.
- Frutilla/aromáticas: grupo mixto — frutilla y menta exigen humedad alta, romero y tomillo prefieren aire seco y suelo bien drenado.
- Frutales: necesitan acumulado de horas de frío (menores a 7 °C) para romper la dormancia. El exceso de HR en primavera favorece torque y monilia. Riego profundo.

Observaciones de integración:
- Los grupos 2 y 4 tienen necesidades internamente contradictorias (mentas/frutilla contra romero/tomillo); habrá que partir los grupos por cultivo.
- Los DLI por grupo reemplazan a los umbrales de lux al pasar el catálogo a DLI.
- El «% de Capacidad de Campo» se traduce a % volumétrico con la formula del capítulo FAO-56 de este documento.

## Partición de los grupos 2 y 4 (aprobada por JowlArx el 27/10/2026)

Marcas: **[EcoCrop]** temperatura óptima dinica por especie; **[FAO-56]** p y Zr; **[grupo]** igual al rango de grupo de JowlArx por falta de fuente; **[propuesto]** derivado por el agente de las notas del grupo, para validar con INTA o un agrónomo.

### Grupo 2 — Fruto

| Cultivo | Temp. día °C | Temp. noche °C | HR % | Suelo banda (% CC) | FAO-56 p / Zr (m) | DLI |
|---|---|---|---|---|---|---|
| Tomate | 20–27 [EcoCrop] | 15–18 [grupo] | 50–65 [grupo] | 60–75 [grupo] | 0.40 / 0.7–1.5 [FAO-56] | 22–30+ [grupo] |
| Pimiento | 17–30 [EcoCrop] | 15–18 [grupo] | 50–65 [grupo] | 60–75 [grupo] | 0.30 / 0.5–1.0 [FAO-56] | 22–30+ [grupo] |
| Berenjena | 20–35 [EcoCrop] | 15–18 [grupo] | 50–65 [grupo] | 60–75 [grupo] | 0.45 / 0.7–1.2 [FAO-56] | 22–30+ [grupo] |
| Zapallito y calabacín | 17–30 [EcoCrop, C. pepo] | 15–18 [grupo] | 50–65 [grupo] | 60–75 [grupo] | 0.50 / 0.6–1.0 [FAO-56] | 22–30+ [grupo] |
| Zapallo anco y plomo | 20–30 [EcoCrop, C. maxima] | 15–18 [grupo] | 50–65 [grupo] | 60–75 [grupo] | 0.35 / 1.0–1.5 [FAO-56] | 22–30+ [grupo] |
| Zapallo cabutiá | 20–30 [EcoCrop, C. moschata] | 15–18 [grupo] | 50–65 [grupo] | 60–75 [grupo] | 0.35 / 1.0–1.5 [FAO-56, aproximado] | 22–30+ [grupo] |

Diferencia real del grupo: los zapallos soportan más sequía (p bajo y raíz profunda) que el pimiento (p 0.30, raíz media). HR, noche y DLI quedan igual al grupo porque no encontré fuente por cultivo.

### Grupo 4 — Frutilla y aromáticas

| Cultivo | Temp. día °C | HR % | Suelo (% CC) | FAO-56 p / Zr (m) | DLI |
|---|---|---|---|---|---|
| Frutilla | 11–24 [EcoCrop] | 60–75 [propuesto] | 70–80 [propuesto] | 0.20 / 0.2–0.3 [FAO-56] | 18–25 [grupo] |
| Menta | sin registro [EcoCrop] | 60–75 [propuesto] | 70–80 [propuesto] | 0.40 / 0.4–0.8 [FAO-56] | 14–20 [propuesto: tolera semisombra] |
| Albahaca | 18–27 [EcoCrop] | 50–65 [propuesto] | 60–70 [propuesto] | sin dato [FAO-56] | 18–25 [grupo] |
| Orégano | 17–28 [EcoCrop] | 40–55 [propuesto] | 50–60 [propuesto] | sin dato [FAO-56] | 20–25 [propuesto: sol pleno] |
| Romero | 18–30 [EcoCrop] | 40–55 [propuesto] | 50–60 [propuesto: suelo bien drenado] | sin dato [FAO-56] | 20–25 [propuesto] |
| Tomillo | 16–25 [EcoCrop] | 40–55 [propuesto] | 50–60 [propuesto] | sin dato [FAO-56] | 20–25 [propuesto] |

La partición separa a las leñosas mediterráneas (aire seco, suelos drenados, riego espaciado) de frutilla y menta (humedad alta constante), según las notas del grupo.

### Cítricos (valores de JowlArx, 27/10/2026)

| Parámetro | Rango | Notas |
|---|---|---|
| Temperatura óptima | 20–30 °C | La vegetación se detiene por debajo de 12–13 °C. Heladas de −2 a −3 °C dañan follaje, brotes y madera |
| HR | 50–70 % | HR mayor a 75–80 % dispara hongos (goma/Phytophthora, sarna, botritis). HR menor a 40 % con viento cálido en floración y cuajado provoca caída de flores y frutos |
| Humedad de suelo | 65–80 % de CC | Humedad constante en el perfil (40–60 cm de raíz). Muy baja tolerancia al encharcamiento. El déficit fuerte detiene el llenado de fruta |
| DLI | 25–35+ mol/m²/día | Sol pleno para floración, acumulación de azúcares y coloración de la cáscara |

## DLI estimado

- El valor medido sigue siendo lux (BH1750). La app calcula el **DLI estimado** del día (mol/m²/día) con 1 µmol/m²/s ≈ 54 lx y muestra el valor en el tooltip del historial para luminosidad.
- Límites confirmados con la hoja de datos del BH1750: satura en 65.535 lx; su respuesta sigue la visión humana, así que la conversión es una aproximación de sol y no vale bajo LED.
- El LDR queda descartado para DLI (no lineal ni calibrado); solo sirve como indicador día/noche.
