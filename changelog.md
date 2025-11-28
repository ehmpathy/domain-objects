# Changelog

## [0.29.5](https://github.com/ehmpathy/domain-objects/compare/v0.29.4...v0.29.5) (2025-11-28)


### Bug Fixes

* **cicd:** unblock declastruct-github provision of repo ([b3f6726](https://github.com/ehmpathy/domain-objects/commit/b3f6726eb37fb5282163c9c30009fdb37af55608))

## [0.29.4](https://github.com/ehmpathy/domain-objects/compare/v0.29.3...v0.29.4) (2025-11-27)


### Bug Fixes

* **manip:** replace all instanceof references with cross-version isOfDomainX pattern ([756c4a6](https://github.com/ehmpathy/domain-objects/commit/756c4a67a96ee321972cf0d3bce2ff12fbd45eb6))
* **practs:** bump to latest best ([4f35a7b](https://github.com/ehmpathy/domain-objects/commit/4f35a7b9255bf89ed489a59369241ea9a0a0109a))

## [0.29.3](https://github.com/ehmpathy/domain-objects/compare/v0.29.2...v0.29.3) (2025-11-27)


### Bug Fixes

* **refs:** assure that RefByPrimary requires presence when key is optionable metadata ([51f728c](https://github.com/ehmpathy/domain-objects/commit/51f728c9844f3c73172801a20d0ae2b509edf950))

## [0.29.2](https://github.com/ehmpathy/domain-objects/compare/v0.29.1...v0.29.2) (2025-11-24)


### Bug Fixes

* **refs:** instantiate refs to domain entities within props ([001bdd8](https://github.com/ehmpathy/domain-objects/commit/001bdd89fb0c46fbc62e43d804eae2b0232c1329))

## [0.29.1](https://github.com/ehmpathy/domain-objects/compare/v0.29.0...v0.29.1) (2025-11-24)


### Bug Fixes

* **refs:** ensure RefByUnique and RefByPrimary constructors narrow down the attributes if built from Refable instance ([6359661](https://github.com/ehmpathy/domain-objects/commit/6359661ab048f7ba495cc0e5a9a86759d2ba5ea8))

## [0.29.0](https://github.com/ehmpathy/domain-objects/compare/v0.28.1...v0.29.0) (2025-11-24)


### Features

* **mark:** mark classes explicitly for cross version compat ([35f784c](https://github.com/ehmpathy/domain-objects/commit/35f784cdeb9868e6573b67b872bf561455ae27df))

## [0.28.1](https://github.com/ehmpathy/domain-objects/compare/v0.28.0...v0.28.1) (2025-11-24)


### Bug Fixes

* **obs:** increase observability of getUniqueIdentifier rejections ([782b6fb](https://github.com/ehmpathy/domain-objects/commit/782b6fb6346570457480ca101a0e04ac820ac6ac))

## [0.28.0](https://github.com/ehmpathy/domain-objects/compare/v0.27.0...v0.28.0) (2025-11-24)


### Features

* **refs:** enable instantiation of RefByUnique and RefByPrimary ([b466b76](https://github.com/ehmpathy/domain-objects/commit/b466b763e91a74e2e3e1cab489f35b16883a67f0))

## [0.27.0](https://github.com/ehmpathy/domain-objects/compare/v0.26.1...v0.27.0) (2025-11-23)


### Features

* **refs:** standardize into ubiquitous names for refs; no more synonyms ([bb71ef5](https://github.com/ehmpathy/domain-objects/commit/bb71ef5fcb870c312b3263d0566d893a71cb2891))

## [0.26.1](https://github.com/ehmpathy/domain-objects/compare/v0.26.0...v0.26.1) (2025-11-23)


### Bug Fixes

* **unique:** recursively extract unique refs ([70e7f9e](https://github.com/ehmpathy/domain-objects/commit/70e7f9e72c0088f78358e68ec33f7bc680fb4e45))
* **unique:** update getUniqueIdentifier to leverage refByUnique ([6c372e5](https://github.com/ehmpathy/domain-objects/commit/6c372e515e54d8f953d87b8e9c524e1980313881))

## [0.26.0](https://github.com/ehmpathy/domain-objects/compare/v0.25.7...v0.26.0) (2025-11-23)


### Features

* **ref:** refByUnique and refByPrimary ([60434ef](https://github.com/ehmpathy/domain-objects/commit/60434ef221121cf06929dc003d0759accf0dba61))

## [0.25.7](https://github.com/ehmpathy/domain-objects/compare/v0.25.6...v0.25.7) (2025-11-23)


### Bug Fixes

* **clone:** preserve constructor inheritance on .clone ([98e765a](https://github.com/ehmpathy/domain-objects/commit/98e765a9de078dc160125fbc99d945b287a58edc))

## [0.25.6](https://github.com/ehmpathy/domain-objects/compare/v0.25.5...v0.25.6) (2025-11-23)


### Bug Fixes

* **tests:** add explicit test coverage on .clone constructor preservation ([a5158ad](https://github.com/ehmpathy/domain-objects/commit/a5158ad8405a119a89bf277a901b4318282e87f7))

## [0.25.5](https://github.com/ehmpathy/domain-objects/compare/v0.25.4...v0.25.5) (2025-11-22)


### Bug Fixes

* **audit:** apply npm audit fix ([177f811](https://github.com/ehmpathy/domain-objects/commit/177f8118fc6d68f380e53e3cdd4798e4f2510898))

## [0.25.4](https://github.com/ehmpathy/domain-objects/compare/v0.25.3...v0.25.4) (2025-11-22)


### Bug Fixes

* **dobj:** propose alias .as to .build, for readability++ ([#73](https://github.com/ehmpathy/domain-objects/issues/73)) ([e61ffa0](https://github.com/ehmpathy/domain-objects/commit/e61ffa06ff5a0d8f3632af0cb5cb2b8669f526dc))
* **obs:** make it easier to detect invalid nested dobjs ([cf37f10](https://github.com/ehmpathy/domain-objects/commit/cf37f100c04c582b960f5b6b584cf00a8f13512f))
* **readme:** describe reference type utils ([#71](https://github.com/ehmpathy/domain-objects/issues/71)) ([68f2b36](https://github.com/ehmpathy/domain-objects/commit/68f2b362fb7f50d2f7c582eadd78787ddeae3aa0))

## [0.25.3](https://github.com/ehmpathy/domain-objects/compare/v0.25.2...v0.25.3) (2025-09-02)


### Bug Fixes

* **practs:** bump to latest best ([#69](https://github.com/ehmpathy/domain-objects/issues/69)) ([e4a79cc](https://github.com/ehmpathy/domain-objects/commit/e4a79cc4ee19a3f5dde5ac31bc3d8e3315d5a89a))

## [0.25.2](https://github.com/ehmpathy/domain-objects/compare/v0.25.1...v0.25.2) (2025-07-05)


### Bug Fixes

* **.build:** narrow .build props to exact shape ([abc3947](https://github.com/ehmpathy/domain-objects/commit/abc3947c7782f56a4e6cf2d32ce14a3c407c01e9))

## [0.25.1](https://github.com/ehmpathy/domain-objects/compare/v0.25.0...v0.25.1) (2025-07-04)


### Bug Fixes

* **pkg:** expose withImmute and clone via pkg ([2238b34](https://github.com/ehmpathy/domain-objects/commit/2238b343c882a0ab0ed53647503e6d32809e1c53))

## [0.25.0](https://github.com/ehmpathy/domain-objects/compare/v0.24.3...v0.25.0) (2025-07-04)


### Features

* **clone:** dobj.build and .clone for immute support ([a5aabaf](https://github.com/ehmpathy/domain-objects/commit/a5aabaf57717109da86edc7f34412010d004840b))


### Bug Fixes

* **practs:** bump to latest best ([f8dccbf](https://github.com/ehmpathy/domain-objects/commit/f8dccbfb2a2ac2f331929820c0862416b3c2a072))

## [0.24.3](https://github.com/ehmpathy/domain-objects/compare/v0.24.2...v0.24.3) (2025-01-08)


### Bug Fixes

* **uni:** check for buffer existence before usage ([#64](https://github.com/ehmpathy/domain-objects/issues/64)) ([25a99b6](https://github.com/ehmpathy/domain-objects/commit/25a99b6d530eb222b0e7bf7327ef05a550bfe8f2))

## [0.24.2](https://github.com/ehmpathy/domain-objects/compare/v0.24.1...v0.24.2) (2024-11-28)


### Bug Fixes

* **uni:** ensure deserialization cache hash doesnt block react native ([#62](https://github.com/ehmpathy/domain-objects/issues/62)) ([e6f0637](https://github.com/ehmpathy/domain-objects/commit/e6f06373978cce307edd64a577ffb20336cb5c50))

## [0.24.1](https://github.com/ehmpathy/domain-objects/compare/v0.24.0...v0.24.1) (2024-09-14)


### Bug Fixes

* **metadata:** enable omitmetadata on arrays directly ([290204a](https://github.com/ehmpathy/domain-objects/commit/290204a72903e3383cea3bc235742546adb97cfb))

## [0.24.0](https://github.com/ehmpathy/domain-objects/compare/v0.23.0...v0.24.0) (2024-09-01)


### Features

* **serde:** cache deserialize in memory since deterministic ([ed9787c](https://github.com/ehmpathy/domain-objects/commit/ed9787c35a5831c2cdd76e358356fd78d8160390))

## [0.23.0](https://github.com/ehmpathy/domain-objects/compare/v0.22.1...v0.23.0) (2024-09-01)


### Features

* **dobjs:** enable skip.schema option on instantiation ([1c48fc6](https://github.com/ehmpathy/domain-objects/commit/1c48fc6246894e928844d99e0c3776955ff47127))


### Bug Fixes

* **practs:** bump practs to latest best ([39c6f8a](https://github.com/ehmpathy/domain-objects/commit/39c6f8abaa97f1a5f1d6123653d73c4ad0321760))

## [0.22.1](https://github.com/ehmpathy/domain-objects/compare/v0.22.0...v0.22.1) (2024-07-26)


### Bug Fixes

* **audit:** drop lodash dependency ([#56](https://github.com/ehmpathy/domain-objects/issues/56)) ([02ad03b](https://github.com/ehmpathy/domain-objects/commit/02ad03b984423be691bc896381f52fd991466bd0))

## [0.22.0](https://github.com/ehmpathy/domain-objects/compare/v0.21.9...v0.22.0) (2024-07-26)


### Features

* **refs:** expose pivot ref declaration ([e020c18](https://github.com/ehmpathy/domain-objects/commit/e020c18d9f8f67fd50e97432e8e4f269ee286487))

## [0.21.9](https://github.com/ehmpathy/domain-objects/compare/v0.21.8...v0.21.9) (2024-07-14)


### Bug Fixes

* **refs:** expose shorthand aliases for ref by unique and ref by primary ([540485e](https://github.com/ehmpathy/domain-objects/commit/540485e9b7c0d84bc8dbc52ec1ccc0c10ebb062d))

## [0.21.8](https://github.com/ehmpathy/domain-objects/compare/v0.21.7...v0.21.8) (2024-07-14)


### Bug Fixes

* **practs:** bump practs to latest best ([c14fbc2](https://github.com/ehmpathy/domain-objects/commit/c14fbc27590ae1f2fcb5b93a8f266338cf63e58b))

## [0.21.7](https://github.com/ehmpathy/domain-objects/compare/v0.21.6...v0.21.7) (2024-07-14)


### Bug Fixes

* **refs:** standardize shape of DomainReference to maximize devexp ([a9ff3ab](https://github.com/ehmpathy/domain-objects/commit/a9ff3abed6e9eeb72a00d060fc27a42e7c59c246))
* **tests:** bump to latest test-fns dep ([79f37bc](https://github.com/ehmpathy/domain-objects/commit/79f37bcae6d9e2ee4941237b2c2f18faee3ffc87))

## [0.21.6](https://github.com/ehmpathy/domain-objects/compare/v0.21.5...v0.21.6) (2024-07-12)


### Bug Fixes

* **rels:** expose reference intuitive.via and support explicit reference prefix ([351e305](https://github.com/ehmpathy/domain-objects/commit/351e30526c935895f6030169acdb2f1b17d4f493))

## [0.21.5](https://github.com/ehmpathy/domain-objects/compare/v0.21.4...v0.21.5) (2024-06-18)


### Bug Fixes

* **dedupe:** improve dedupe operation cost from O(n^2) to O(n) ([87faa66](https://github.com/ehmpathy/domain-objects/commit/87faa663ebefba97432c3bd39b4fd227429c0f82))

## [0.21.4](https://github.com/ehmpathy/domain-objects/compare/v0.21.3...v0.21.4) (2024-06-18)


### Bug Fixes

* **dedupe:** support dedupe of literals as well ([5a1f06a](https://github.com/ehmpathy/domain-objects/commit/5a1f06a483fb2e2e53041f159265bfff5cbdcbc2))

## [0.21.3](https://github.com/ehmpathy/domain-objects/compare/v0.21.2...v0.21.3) (2024-06-14)


### Bug Fixes

* **refs:** explicitly check for unique keys rather than invert primary keys ([1a2525e](https://github.com/ehmpathy/domain-objects/commit/1a2525e000b82cae6234f4d115a332092eae5306))

## [0.21.2](https://github.com/ehmpathy/domain-objects/compare/v0.21.1...v0.21.2) (2024-06-14)


### Bug Fixes

* **refs:** expose typeguard to check isPrimaryKeyRef and isUniqueKeyRef ([a454602](https://github.com/ehmpathy/domain-objects/commit/a454602b538e364c3947a9b1115e70e634fbe2e3))

## [0.21.1](https://github.com/ehmpathy/domain-objects/compare/v0.21.0...v0.21.1) (2024-06-14)


### Bug Fixes

* **refs:** ensure primary key shape requires the property even if its optional in def ([e045166](https://github.com/ehmpathy/domain-objects/commit/e045166721e8a889caac5904734b02ac5b4743f6))

## [0.21.0](https://github.com/ehmpathy/domain-objects/compare/v0.20.0...v0.21.0) (2024-05-27)


### Features

* **refs:** expose DomainUniqueKeyShape and DomainPrimaryKeyShape ([4239032](https://github.com/ehmpathy/domain-objects/commit/42390325d9a046d7802e9887f06460a9dea43d97))

## [0.20.0](https://github.com/ehmpathy/domain-objects/compare/v0.19.1...v0.20.0) (2024-05-25)


### Features

* **ref:** support DomainReferences via class statics ([4f7a284](https://github.com/ehmpathy/domain-objects/commit/4f7a284590fee9eafe8d8e14dba1a858965d7555))

## [0.19.1](https://github.com/ehmpathy/domain-objects/compare/v0.19.0...v0.19.1) (2024-05-17)


### Bug Fixes

* **dedupe:** add safety with failfast on diff entity version detection ([491d716](https://github.com/ehmpathy/domain-objects/commit/491d7167490f8c3cdd4dd1263a5bfdf62981ef2e))
* **readme:** update the docs to improve examples ([29963b8](https://github.com/ehmpathy/domain-objects/commit/29963b844a841a4e79117d99678a1dd7500b3303))

## [0.19.0](https://github.com/ehmpathy/domain-objects/compare/v0.18.0...v0.19.0) (2024-05-16)


### Features

* **alias:** support specification of plural vs singular alias ([55f3bc7](https://github.com/ehmpathy/domain-objects/commit/55f3bc79d944a596839e584c86b8364044b1abc7))

## [0.18.0](https://github.com/ehmpathy/domain-objects/compare/v0.17.0...v0.18.0) (2024-05-16)


### Features

* **literal:** rename DomainValueObject to DomainLiteral for intuition++ ([fb77ff7](https://github.com/ehmpathy/domain-objects/commit/fb77ff7b31ed29ebfbd51e31c2b9576682d4b6da))

## [0.17.0](https://github.com/ehmpathy/domain-objects/compare/v0.16.0...v0.17.0) (2024-05-11)


### Features

* **schema:** support zod schema for runtime validation ([#39](https://github.com/ehmpathy/domain-objects/issues/39)) ([b6c4000](https://github.com/ehmpathy/domain-objects/commit/b6c4000f86e9e5980e183d97170ee528621bce7e))

## [0.16.0](https://github.com/ehmpathy/domain-objects/compare/v0.15.0...v0.16.0) (2024-05-11)


### Features

* **alias:** support DomainObject.alias declaration ([#37](https://github.com/ehmpathy/domain-objects/issues/37)) ([7348ae2](https://github.com/ehmpathy/domain-objects/commit/7348ae257d392725fd5885d47fc055f4b76cf8fd))

## [0.15.0](https://github.com/ehmpathy/domain-objects/compare/v0.14.0...v0.15.0) (2024-04-28)


### Features

* **exports:** expose method to dedupe by identity ([6f043cc](https://github.com/ehmpathy/domain-objects/commit/6f043cc48f47c6932d19f767345d31ad21de5f14))

## [0.14.0](https://github.com/ehmpathy/domain-objects/compare/v0.13.2...v0.14.0) (2024-04-28)


### Features

* **relate:** add method to dedupe dobjs by identity ([ef13b1e](https://github.com/ehmpathy/domain-objects/commit/ef13b1ebda66e63a00bdc67ffb84e5bcdc694ee6))

## [0.13.2](https://github.com/ehmpathy/domain-objects/compare/v0.13.1...v0.13.2) (2023-08-07)


### Bug Fixes

* **manip:** limit unique identifier slug to shorter string ([df74bda](https://github.com/ehmpathy/domain-objects/commit/df74bda3e0e341bcb4656a07ea428b84c12f2848))

## [0.13.1](https://github.com/ehmpathy/domain-objects/compare/v0.13.0...v0.13.1) (2023-08-07)


### Bug Fixes

* **devexp:** make unexpected domain object errors more helpful ([83c4215](https://github.com/ehmpathy/domain-objects/commit/83c4215e508c63e59182e5fbc3a7ef4c15963228))

## [0.13.0](https://github.com/ehmpathy/domain-objects/compare/v0.12.0...v0.13.0) (2023-08-07)


### Features

* **manipulation:** add getUniqueIdentifierSlug method ([896864b](https://github.com/ehmpathy/domain-objects/commit/896864bc7ec6a5909b7cbd9e19347a5c0ab91188))

## [0.12.0](https://github.com/ehmpathy/domain-objects/compare/v0.11.3...v0.12.0) (2023-08-06)


### Features

* **manipulation:** add method to getUpdatableProperties ([517ee23](https://github.com/ehmpathy/domain-objects/commit/517ee23a53fd5b0f53da0ce7cb25651385c452fe))

## [0.11.3](https://github.com/ehmpathy/domain-objects/compare/v0.11.2...v0.11.3) (2023-08-05)


### Bug Fixes

* **relationships:** ensure that plural for of names is considered explicit reference ([21c2f80](https://github.com/ehmpathy/domain-objects/commit/21c2f80eb9cae8e002ad8079ad595f8a47ae3598))

## [0.11.2](https://github.com/ehmpathy/domain-objects/compare/v0.11.1...v0.11.2) (2023-08-05)


### Bug Fixes

* **deps:** ensure joi and yup usage imports only type references ([c8b3ed5](https://github.com/ehmpathy/domain-objects/commit/c8b3ed518f843907c9bc373c10d52e37d6e0854e))

## [0.11.1](https://github.com/ehmpathy/domain-objects/compare/v0.11.0...v0.11.1) (2023-08-05)


### Bug Fixes

* **practs:** use latest best practices and resolve audit ([29d9be1](https://github.com/ehmpathy/domain-objects/commit/29d9be1336105c48bdabe2722a828dca2b6b17d6))

## [0.11.0](https://www.github.com/ehmpathy/domain-objects/compare/v0.10.4...v0.11.0) (2023-08-05)


### Features

* **relationships:** expose isPropertyNameAReference methods ([1f20166](https://www.github.com/ehmpathy/domain-objects/commit/1f20166e50afa9107f62b45aa1c9b0958c989048))

### [0.10.4](https://www.github.com/ehmpathy/domain-objects/compare/v0.10.3...v0.10.4) (2023-05-13)


### Bug Fixes

* **serialization:** preserve array order by default ([#25](https://www.github.com/ehmpathy/domain-objects/issues/25)) ([40a379f](https://www.github.com/ehmpathy/domain-objects/commit/40a379f11fd3ab5702f555cf8d492d3e2a9ddff8))

### [0.10.3](https://www.github.com/ehmpathy/domain-objects/compare/v0.10.2...v0.10.3) (2022-12-29)


### Bug Fixes

* **deps:** upgrade deps with npm audit fix ([255c4b0](https://www.github.com/ehmpathy/domain-objects/commit/255c4b0d177de0a63d8b16c0f4311fe8a362a595))

### [0.10.2](https://www.github.com/ehmpathy/domain-objects/compare/v0.10.1...v0.10.2) (2022-12-29)


### Bug Fixes

* **constraints:** assert that domain object which has all nested objects already instantiated as safe ([741794b](https://www.github.com/ehmpathy/domain-objects/commit/741794b24c2ad6b5f89cf634edba61fd6f5f98b9))

### [0.10.1](https://www.github.com/ehmpathy/domain-objects/compare/v0.10.0...v0.10.1) (2022-12-15)


### Bug Fixes

* **docs:** improve the helpfulness of omitMetadataValues jsdoc ([dedc363](https://www.github.com/ehmpathy/domain-objects/commit/dedc363c306f322e3b8b7ef79cb4d0ec820d2e31))

## [0.10.0](https://www.github.com/ehmpathy/domain-objects/compare/v0.9.3...v0.10.0) (2022-12-07)


### Features

* **entity:** support entities being unique on more than one set of keys ([e39da1e](https://www.github.com/ehmpathy/domain-objects/commit/e39da1e6c55eb805af1c0b92577f426c5c90014b))
* **metadata:** add DomainObject.metadata prop, expose getMetadataKeys and omitMetadataValues methods ([34b38f5](https://www.github.com/ehmpathy/domain-objects/commit/34b38f597eb2f592d14ea638620b1963672a317e))

### [0.9.3](https://www.github.com/ehmpathy/domain-objects/compare/v0.9.2...v0.9.3) (2022-12-06)


### Bug Fixes

* **identity:** enable specifying custom metadata keys for value objects ([8d06f2a](https://www.github.com/ehmpathy/domain-objects/commit/8d06f2a88e7686bf1c2676f86abfb12fc088fc50))

### [0.9.2](https://www.github.com/ehmpathy/domain-objects/compare/v0.9.1...v0.9.2) (2022-12-02)


### Bug Fixes

* **hydration:** drop over-cautious assertion after valid usecase found ([3f1c2d7](https://www.github.com/ehmpathy/domain-objects/commit/3f1c2d70faf171b426a6112313f134d21d73a44c))

### [0.9.1](https://www.github.com/ehmpathy/domain-objects/compare/v0.9.0...v0.9.1) (2022-11-26)


### Bug Fixes

* **errors:** add potential solutions to the nested hydration error messages ([e5fc797](https://www.github.com/ehmpathy/domain-objects/commit/e5fc7978899ae121e8fe99af69ef06071957d8c9))
* **errors:** make errors on nested domain object hydration easier on the eyes ([d9230f1](https://www.github.com/ehmpathy/domain-objects/commit/d9230f140ed953383522455473be072643cabc7d))

## [0.9.0](https://www.github.com/ehmpathy/domain-objects/compare/v0.8.0...v0.9.0) (2022-11-26)


### Features

* **nested:** support nested domain objects being hydrated from an array of declared class options ([2424145](https://www.github.com/ehmpathy/domain-objects/commit/2424145f74d491c2150e5766a52dcd9b63c58e80))

## [0.8.0](https://www.github.com/ehmpathy/domain-objects/compare/v0.7.6...v0.8.0) (2022-11-26)


### Features

* **manipulation:** support lossless and hydrated serialization and deserialization of domain objects ([7e146a7](https://www.github.com/ehmpathy/domain-objects/commit/7e146a77ee0191a25facc6b60c16c46b7757fa91))


### Bug Fixes

* **cicd:** update cicd marginally ([e4a4556](https://www.github.com/ehmpathy/domain-objects/commit/e4a4556ba2212607a78ccdd3112d23cf94b8d1d8))
* **repo:** transfer ownership from uladkasach to ehmpathy org ([a1ded4b](https://www.github.com/ehmpathy/domain-objects/commit/a1ded4bbdd9bcd2a0c5df91a7d77673eb4616797))

### [0.7.6](https://www.github.com/ehmpathy/domain-objects/compare/v0.7.5...v0.7.6) (2021-12-16)


### Bug Fixes

* **manipulation:** assert domain objects with nested well-known-type objects or basic-type-arrays are safe to manipulate ([944ed81](https://www.github.com/ehmpathy/domain-objects/commit/944ed81060b76c1e01442123fa05d58ca5c0d838))
