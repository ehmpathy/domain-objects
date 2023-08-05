import { isPropertyNameAReferenceIntuitively } from './isPropertyNameAReferenceIntuitively';

describe('isPropertyNameAReferenceIntuitively', () => {
  const cases: {
    propertyName: string;
    domainObjectName: string;
    expectedResult: boolean;
  }[] = [
    {
      propertyName: 'address',
      domainObjectName: 'Address',
      expectedResult: true,
    },
    {
      propertyName: 'homeAddress',
      domainObjectName: 'Address',
      expectedResult: true,
    },
    {
      propertyName: 'home',
      domainObjectName: 'Address',
      expectedResult: false,
    },
    {
      propertyName: 'engineerUuid',
      domainObjectName: 'Engineer',
      expectedResult: true,
    },
    {
      propertyName: 'leadEngineerUuid',
      domainObjectName: 'Engineer',
      expectedResult: true,
    },
    {
      propertyName: 'engineerUuids',
      domainObjectName: 'Engineer',
      expectedResult: true,
    },
    {
      propertyName: 'assignedEngineerUuids',
      domainObjectName: 'Engineer',
      expectedResult: true,
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
      expectedResult: true,
    },
    {
      propertyName: 'headEngineerUuid',
      domainObjectName: 'LeadEngineer',
      expectedResult: true,
    },
    {
      propertyName: 'engineerUuid',
      domainObjectName: 'LeadEngineer',
      expectedResult: true,
    },
  ];

  cases.forEach((testCase) => {
    it(`should return ${testCase.expectedResult} for ${testCase.propertyName}: ${testCase.domainObjectName}`, () => {
      expect(
        isPropertyNameAReferenceIntuitively({
          propertyName: testCase.propertyName,
          domainObjectName: testCase.domainObjectName,
        }),
      ).toEqual(testCase.expectedResult);
    });
  });
});
