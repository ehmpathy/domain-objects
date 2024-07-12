import { isPropertyNameAReferenceIntuitively } from './isPropertyNameAReferenceIntuitively';

describe('isPropertyNameAReferenceIntuitively', () => {
  const cases: {
    propertyName: string;
    domainObjectName: string;
    expectedResult: false | { via: string };
  }[] = [
    {
      propertyName: 'address',
      domainObjectName: 'Address',
      expectedResult: { via: 'Address' },
    },
    {
      propertyName: 'homeAddress',
      domainObjectName: 'Address',
      expectedResult: { via: 'Address' },
    },
    {
      propertyName: 'home',
      domainObjectName: 'Address',
      expectedResult: false,
    },
    {
      propertyName: 'engineer',
      domainObjectName: 'Engineer',
      expectedResult: { via: 'Engineer' },
    },
    {
      propertyName: 'engineers',
      domainObjectName: 'Engineer',
      expectedResult: { via: 'Engineer' },
    },
    {
      propertyName: 'engineerUuid',
      domainObjectName: 'Engineer',
      expectedResult: { via: 'Engineer' },
    },
    {
      propertyName: 'leadEngineerUuid',
      domainObjectName: 'Engineer',
      expectedResult: { via: 'Engineer' },
    },
    {
      propertyName: 'engineerUuids',
      domainObjectName: 'Engineer',
      expectedResult: { via: 'Engineer' },
    },
    {
      propertyName: 'assignedEngineerUuids',
      domainObjectName: 'Engineer',
      expectedResult: { via: 'Engineer' },
    },
    {
      propertyName: 'lead',
      domainObjectName: 'Engineer',
      expectedResult: false,
    },
    {
      propertyName: 'leadUuid',
      domainObjectName: 'Engineer',
      expectedResult: false,
    },
    {
      propertyName: 'assignedUuids',
      domainObjectName: 'Engineer',
      expectedResult: false,
    },
    {
      propertyName: 'leadEngineerUuid',
      domainObjectName: 'LeadEngineer',
      expectedResult: { via: 'LeadEngineer' },
    },
    {
      propertyName: 'headEngineerUuid',
      domainObjectName: 'LeadEngineer',
      expectedResult: { via: 'Engineer' },
    },
    {
      propertyName: 'engineerUuid',
      domainObjectName: 'LeadEngineer',
      expectedResult: { via: 'Engineer' },
    },
  ];

  cases.forEach((testCase) => {
    it(`should return ${JSON.stringify(testCase.expectedResult)} for ${
      testCase.propertyName
    }: ${testCase.domainObjectName}`, () => {
      expect(
        isPropertyNameAReferenceIntuitively({
          propertyName: testCase.propertyName,
          domainObjectName: testCase.domainObjectName,
        }),
      ).toEqual(testCase.expectedResult);
    });
  });
});
