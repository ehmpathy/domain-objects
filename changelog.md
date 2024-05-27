# Changelog

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
