import { getDomainObjectNameAfterDroppingSomeQualifiers } from './getDomainObjectNameAfterDroppingSomeQualifiers';

describe('getDomainObjectNameAfterDroppingSomeQualifiers', () => {
  const cases: {
    domainObjectName: string;
    qualifiersToDrop: number;
    expectedResult: string | null;
  }[] = [
    {
      domainObjectName: 'HomeAddress',
      qualifiersToDrop: 1,
      expectedResult: 'Address',
    },
    {
      domainObjectName: 'HomeAddress',
      qualifiersToDrop: 2,
      expectedResult: null,
    },
    {
      domainObjectName: 'PlaceExternalId',
      qualifiersToDrop: 1,
      expectedResult: 'ExternalId',
    },
    {
      domainObjectName: 'PlaceExternalId',
      qualifiersToDrop: 2,
      expectedResult: null,
    },
    {
      domainObjectName: 'TrainStationDockingGate',
      qualifiersToDrop: 2,
      expectedResult: 'DockingGate',
    },
    {
      domainObjectName: 'TrainStationDockingGate',
      qualifiersToDrop: 3,
      expectedResult: 'Gate',
    },
    {
      domainObjectName: 'TrainStationDockingGate',
      qualifiersToDrop: 4,
      expectedResult: null,
    },
  ];

  cases.forEach((testCase) => {
    it(`should return ${testCase.expectedResult} for ${testCase.domainObjectName}, ${testCase.qualifiersToDrop}`, () => {
      expect(
        getDomainObjectNameAfterDroppingSomeQualifiers({
          domainObjectName: testCase.domainObjectName,
          qualifiersToDrop: testCase.qualifiersToDrop,
        }),
      ).toEqual(testCase.expectedResult);
    });
  });
});
