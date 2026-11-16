# Ключи подписи и RuStore — инструкция

Дата: 2026-11-15
Область: Android-приложение `com.gymapp.gym_trainer`, публикация AAB в RuStore.
Дополнительно: CSR для сертификата разработчика ОС Аврора.

Источники:

- RuStore, загрузка AAB и подписи:
  https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication/new-version-app/upload-aab#upload-sign-key
- RuStore, генерация CSR для ОС Аврора:
  https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication/app-publication-aurora/dev-certificate/generate-csr

> Для Android-приложения используется схема **AAB + ключ загрузки + ключ
> подписи приложения**. CSR по ГОСТ 34.10-2012 нужен только для публикации
> в ОС Аврора и не заменяет Android-подпись.

---

## 1. Термины

| Термин | Назначение |
| --- | --- |
| Ключ подписи приложения (`sign`) | Долгосрочный ключ, которым RuStore подписывает APK для пользователей |
| Ключ загрузки (`upload`) | Ключ, которым разработчик подписывает AAB перед загрузкой |
| Сертификат ключа загрузки | PEM-файл открытого сертификата upload-ключа |
| PEPK | Инструмент RuStore для экспорта ключа подписи в зашифрованный ZIP |
| Keystore | Хранилище ключей (`.keystore`/`.jks`) |
| CSR | Запрос на сертификат (Certificate Signing Request) |
| AAB | Android App Bundle |

Требования RuStore: RSA не менее 2048 бит, Java 11+.

---

## 2. Что уже есть в проекте

- Keystore: `/opt/compose/keyAPP/app-key.keystore` (вне git), создан
  2026-11-15.
- Alias `sign` — ключ подписи приложения; alias `upload` — ключ загрузки AAB.
- Сертификат upload-ключа: `/opt/compose/keyAPP/upload_cert.pem`.
- Пароль, alias и пароль ключа хранятся у владельца; в репозиторий и
  документацию не попадают.
- Файл параметров: `mobile/android/key.properties` (в `.gitignore`),
  `keyAlias=upload`.
- Release-сборка использует этот ключ; debug-подпись допустима только для
  локальной отладки.
- Смена ключа означает, что для уже распространённых сборок со старой
  подписью потребуется процедура смены ключа в RuStore.

Проверить содержимое хранилища (потребуется пароль):

```bash
keytool -list -v \
  -keystore /opt/compose/keyAPP/app-key.keystore \
  -storepass '<storePassword>'
```

Проверить конкретный alias:

```bash
keytool -list -v \
  -keystore /opt/compose/keyAPP/app-key.keystore \
  -alias '<keyAlias>' \
  -storepass '<storePassword>'
```

---

## 3. Вариант A. Новый ключ (если ключей ещё нет)

Выполнять в защищённом каталоге, например `/opt/compose/keyAPP`.

### 3.1. Создать ключ подписи приложения

```bash
keytool -genkeypair \
  -keystore /opt/compose/keyAPP/app-key.keystore \
  -alias sign \
  -keyalg RSA -keysize 2048 -validity 36500 \
  -storetype PKCS12
```

`keytool` запросит пароль хранилища, данные владельца (часть можно пропустить)
и пароль ключа. Сохраните пароли в менеджере секретов.

> В документации RuStore используется `-genkey`; `-genkeypair` — современный
> эквивалент. Срок 36500 дней соответствует рекомендации RuStore.

### 3.2. Создать ключ загрузки

```bash
keytool -genkeypair \
  -keystore /opt/compose/keyAPP/app-key.keystore \
  -alias upload \
  -keyalg RSA -keysize 2048 -validity 36500 \
  -storetype PKCS12
```

Можно использовать отдельный keystore для upload-ключа; тогда укажите его в
`key.properties`.

### 3.3. Экспортировать ключ подписи через PEPK

1. В RuStore Консоли: **Приложения → выберите приложение → Загрузить версию →
   Загрузить** напротив «Подпись не загружена».
2. Скачайте `pepk.jar` из окна «Загрузка подписи приложения».
3. Скопируйте из консоли команду запуска PEPK — в ней уже есть уникальный
   `encryptionkey`.
4. Замените пути/alias и выполните (пример):

```bash
java -jar pepk.jar \
  --keystore=/opt/compose/keyAPP/app-key.keystore \
  --alias=sign \
  --output=/opt/compose/keyAPP/pepk_out.zip \
  --encryptionkey='<encryptionkey_из_консоли>' \
  --include-cert
```

`--include-cert` — это флаг без значения; путь к каталогу после него
указывать нельзя. Введите пароль хранилища и ключа. Результат —
`pepk_out.zip` с `encryptedPrivateKey` и `certificate.pem`.

Фактически сформирован 2026-11-15 для alias `sign`:
`/opt/compose/keyAPP/pepk_out.zip` (SHA-256
`a8bbd201d59de41fc811a6dfc749d2044b9633421dd88834f3e8be45b6a2914e`),
сертификат внутри совпадает с `sign` (`19:CA:96:...:8F:A3`).

> `pepk.jar` должен находиться в каталоге, из которого запускается команда,
> либо укажите полный путь к jar. Точный набор аргументов копируйте из
> RuStore Консоли: он может дополняться.

### 3.4. Экспортировать сертификат ключа загрузки

```bash
keytool -exportcert \
  -alias upload \
  -keystore /opt/compose/keyAPP/app-key.keystore \
  -rfc \
  -file /opt/compose/keyAPP/upload_cert.pem
```

### 3.5. Загрузить в RuStore

В окне «Загрузка подписи приложения» загрузите:

- `pepk_out.zip` — ZIP с подписью приложения;
- `upload_cert.pem` — сертификат ключа загрузки.

Нажмите **Отправить подпись**, затем загрузите AAB.

---

## 4. Вариант B. Уже существующая подпись

Если ключи и сертификат уже есть:

1. Пропустите генерацию.
2. Выполните PEPK для существующего ключа подписи (раздел 3.3).
3. Экспортируйте PEM-сертификат upload-ключа (раздел 3.4).
4. Загрузите ZIP и PEM в RuStore.

Если keystore в формате `.jks`, RuStore рекомендует импортировать его в
`.keystore`:

```bash
keytool -importkeystore \
  -srckeystore old.jks \
  -destkeystore new.keystore \
  -srcstorepass '<пароль_jks>' \
  -deststorepass '<пароль_keystore>'
```

---

## 5. Настройка подписи Flutter

### 5.1. `mobile/android/key.properties`

Файл не коммитится (уже в `.gitignore`), права `0600`:

```properties
storeFile=/opt/compose/keyAPP/app-key.keystore
storePassword=<storePassword>
keyAlias=upload
keyPassword=<keyPassword>
```

`keyAlias=upload` — если AAB подписывается upload-ключом. Если используете
один ключ для всего, укажите его alias.

```bash
chmod 600 /opt/compose/keyAPP/app-key.keystore
chmod 600 mobile/android/key.properties
```

### 5.2. `mobile/android/app/build.gradle.kts`

Добавляется загрузка `key.properties` и release-подпись:

```kotlin
import java.util.Properties
import java.io.FileInputStream

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    // ...
    signingConfigs {
        create("release") {
            if (keystorePropertiesFile.exists()) {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }
    buildTypes {
        release {
            signingConfig = if (keystorePropertiesFile.exists()) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}
```

### 5.3. Сборка

```bash
cd mobile
flutter build apk --release \
  --dart-define=API_URL=https://demogym.staff-rf.ru:3000
flutter build appbundle --release \
  --dart-define=API_URL=https://demogym.staff-rf.ru:3000
```

Артефакты:

- `mobile/build/app/outputs/flutter-apk/app-release.apk`
- `mobile/build/app/outputs/bundle/release/app-release.aab`

### 5.4. Проверка подписи и версии

```bash
apksigner verify --print-certs \
  mobile/build/app/outputs/flutter-apk/app-release.apk
keytool -printcert -jarfile \
  mobile/build/app/outputs/flutter-apk/app-release.apk
aapt2 dump badging \
  mobile/build/app/outputs/flutter-apk/app-release.apk | head
sha256sum \
  mobile/build/app/outputs/flutter-apk/app-release.apk \
  mobile/build/app/outputs/bundle/release/app-release.aab
```

Убедитесь, что:

- сертификат совпадает с ожидаемым (не `CN=Android Debug`);
- `versionCode`/`versionName` соответствуют `pubspec.yaml`;
- в APK/AAB нет старых хостов (`gum.staff-rf.ru`, `gym.rf-rf.ru`);
- присутствует `demogym.staff-rf.ru:3000`.

Проверка адреса в нативной библиотеке:

```bash
unzip -p mobile/build/app/outputs/flutter-apk/app-release.apk \
  lib/arm64-v8a/libapp.so | strings | grep -E 'demogym|gum\.|gym\.rf'
```

---

## 6. Загрузка AAB в RuStore

1. Убедитесь, что подпись загружена (раздел 3.5).
2. Размер AAB ≤ 5 ГБ; имя файла уникально.
3. При необходимости проверьте APK через bundletool:

```bash
java -jar bundletool-all-1.18.1.jar build-apks \
  --bundle=mobile/build/app/outputs/bundle/release/app-release.aab \
  --output-format=DIRECTORY \
  --output=/tmp/apks \
  --mode=universal
```

4. В RuStore Консоли нажмите **Выберите файл**, выберите AAB.
5. Заполните параметры версии и отправьте на модерацию.

При обновлении приложения:

- increment `versionCode` (в `pubspec.yaml` — часть после `+`);
- обновите `versionName`;
- заполните changelog;
- используйте тот же ключ подписи приложения; upload-ключ может меняться
  только через процедуру сброса в RuStore.

---

## 7. CSR для сертификата разработчика ОС Аврора

Раздел нужен только для публикации в ОС Аврора. Для Android он не требуется.

### 7.1. Сгенерировать ключ ГОСТ 34.10-2012

```bash
openssl genpkey \
  -engine gost \
  -algorithm gost2012_256 \
  -pkeyopt paramset:A \
  -aes256 \
  -out /opt/compose/keyAPP/aurora-key.pem
```

Команда запросит пароль шифрования закрытого ключа. Ключ приватный; доступ —
только уполномоченным сотрудникам.

Если `gost` engine недоступен, установите пакет ГОСТ-провайдера для OpenSSL
(например, `openssl-gost-engine`) и проверьте `openssl list -providers`.

### 7.2. Создать `csr.conf`

```ini
[ req ]
distinguished_name = req_distinguished_name
prompt = no
string_mask = utf8only
x509_extensions = v3_usr

[ req_distinguished_name ]
CN = {COMMON_NAME}

[ v3_usr ]
basicConstraints=critical,CA:FALSE
keyUsage=digitalSignature
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid
```

`{COMMON_NAME}` — уникальный идентификатор:

- доменное имя компании;
- ФИО разработчика-физлица в RuStore;
- уникальный никнейм/название разработчика.

Требования: не более 64 символов, уникальность, отсутствие оскорбительной,
противозаконной или вводящей в заблуждение информации. При несоответствии
RuStore может запросить новый CSR.

### 7.3. Сгенерировать CSR

```bash
openssl req -new -utf8 -batch \
  -config /opt/compose/keyAPP/csr.conf \
  -key /opt/compose/keyAPP/aurora-key.pem \
  -out /opt/compose/keyAPP/aurora.csr.pem
```

Проверить запрос:

```bash
openssl req -in /opt/compose/keyAPP/aurora.csr.pem -noout -subject -text
```

Передать `aurora.csr.pem` в RuStore согласно инструкции для ОС Аврора.
Закрытый ключ `aurora-key.pem` не передаётся.

---

## 8. Безопасность

- Не коммитить `*.keystore`, `*.jks`, `key.properties`, `*.pem` с приватными
  ключами, `pepk_out.zip`.
- Хранить keystore и пароли раздельно; минимум две копии в защищённых местах.
- Права: каталог `0700`, keystore/key.properties `0600`.
- Не пересылать пароли в чатах и тикетах; использовать менеджер секретов.
- При компрометации upload-ключа — сброс подписи в RuStore; ключ подписи
  приложения менять нельзя без потери обновлений.
- Резервная копия keystore обязательна: без неё невозможно выпускать
  обновления.

## 9. Чек-лист

- [ ] JDK 11+ и `keytool` доступны.
- [ ] Keystore создан/найден; alias и пароли сохранены.
- [x] `pepk_out.zip` сформирован.
- [x] `upload_cert.pem` экспортирован.
- [ ] ZIP и PEM загружены в RuStore, подпись принята.
- [ ] `key.properties` создан, права 0600, в git не попадает.
- [ ] `build.gradle.kts` использует release-подпись.
- [ ] APK/AAB собраны с `API_URL=https://demogym.staff-rf.ru:3000`.
- [ ] `apksigner` подтверждает не-debug сертификат.
- [ ] versionCode/versionName и changelog обновлены.
- [ ] AAB загружен в RuStore.
- [ ] (при необходимости) CSR для ОС Аврора сгенерирован и передан.
