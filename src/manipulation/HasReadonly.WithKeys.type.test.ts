import type {
  WithKeys,
  WithKeysDeep,
  WithKeysFlat,
} from './HasReadonly.WithKeys.type';

// shared shapes for the type tests
interface NetworkInterface {
  publicIpEnabled: boolean;
  privateIp?: string;
}
interface Network {
  subnet: string;
  interface: NetworkInterface;
}
interface InterfaceMeta {
  label: string;
  serial?: string;
}
interface NetworkInterfaceDeep {
  publicIpEnabled: boolean;
  meta?: InterfaceMeta;
}
interface NetworkDeep {
  subnet: string;
  interface: NetworkInterfaceDeep;
}
interface Instance {
  arn?: string;
  name: string;
  network: Network;
}
interface InstanceDeep {
  name: string;
  network: NetworkDeep;
}
interface InstanceMultiNic {
  name: string;
  interfaces: NetworkInterface[];
}

describe('WithKeys types', () => {
  describe('WithKeysFlat', () => {
    it('should make the targeted flat keys required (positive)', () => {
      const x: WithKeysFlat<Instance, 'arn'> = {
        arn: 'arn:aws:ec2:...',
        name: 'web-1',
        network: { subnet: 's', interface: { publicIpEnabled: true } },
      };
      // arn narrowed to required (string, not string | undefined)
      const arn: string = x.arn;
      expect(arn).toBe('arn:aws:ec2:...');
    });

    it('should type-error when a targeted flat key is absent (negative)', () => {
      // @ts-expect-error: Property 'arn' is absent
      const x: WithKeysFlat<Instance, 'arn'> = {
        name: 'web-1',
        network: { subnet: 's', interface: { publicIpEnabled: true } },
      };
      expect(x).toBeDefined();
    });

    it('should leave the instance unchanged when no flat keys are given (never passthrough)', () => {
      // no flat keys => arn stays optional, no requirement added
      const x: WithKeysFlat<Instance, never> = {
        name: 'web-1',
        network: { subnet: 's', interface: { publicIpEnabled: true } },
      };
      const arn: string | undefined = x.arn;
      expect(arn).toBeUndefined();
    });
  });

  describe('WithKeysDeep', () => {
    it('should make a deep dot-path field required (positive)', () => {
      const x: WithKeysDeep<Instance, 'network.interface.privateIp'> = {
        name: 'web-1',
        network: {
          subnet: 's',
          interface: { publicIpEnabled: true, privateIp: '10.0.0.5' },
        },
      };
      // deep field narrowed to required
      const privateIp: string = x.network.interface.privateIp;
      expect(privateIp).toBe('10.0.0.5');
    });

    it('should type-error when the deep dot-path field is absent (negative)', () => {
      const x: WithKeysDeep<Instance, 'network.interface.privateIp'> = {
        name: 'web-1',
        network: {
          subnet: 's',
          // @ts-expect-error: Property 'privateIp' is absent
          interface: { publicIpEnabled: true },
        },
      };
      expect(x).toBeDefined();
    });

    it('should apply a deep dot-path to every element of an array (positive)', () => {
      const x: WithKeysDeep<InstanceMultiNic, 'interfaces.privateIp'> = {
        name: 'web-1',
        interfaces: [
          { publicIpEnabled: true, privateIp: '10.0.0.5' },
          { publicIpEnabled: false, privateIp: '10.0.0.6' },
        ],
      };
      // each element's deep field narrowed to required
      const privateIp: string = x.interfaces[0]!.privateIp;
      expect(privateIp).toBe('10.0.0.5');
    });

    it('should type-error when an array element lacks the deep field (negative)', () => {
      const x: WithKeysDeep<InstanceMultiNic, 'interfaces.privateIp'> = {
        name: 'web-1',
        interfaces: [
          { publicIpEnabled: true, privateIp: '10.0.0.5' },
          // @ts-expect-error: Property 'privateIp' is absent on this element
          { publicIpEnabled: false },
        ],
      };
      expect(x).toBeDefined();
    });

    it('should narrow a three-level deep dot-path (positive)', () => {
      const x: WithKeysDeep<InstanceDeep, 'network.interface.meta.serial'> = {
        name: 'web-1',
        network: {
          subnet: 's',
          interface: {
            publicIpEnabled: true,
            meta: { label: 'nic-0', serial: 'SN-123' },
          },
        },
      };
      // intermediate `meta` becomes required, terminal `serial` becomes required
      const serial: string = x.network.interface.meta.serial;
      expect(serial).toBe('SN-123');
    });

    it('should type-error when a three-level deep terminal is absent (negative)', () => {
      const x: WithKeysDeep<InstanceDeep, 'network.interface.meta.serial'> = {
        name: 'web-1',
        network: {
          subnet: 's',
          interface: {
            publicIpEnabled: true,
            // @ts-expect-error: Property 'serial' is absent on meta
            meta: { label: 'nic-0' },
          },
        },
      };
      expect(x).toBeDefined();
    });

    it('should leave the instance unchanged when no deep keys are given (never passthrough)', () => {
      const x: WithKeysDeep<Instance, never> = {
        name: 'web-1',
        network: { subnet: 's', interface: { publicIpEnabled: true } },
      };
      const privateIp: string | undefined = x.network.interface.privateIp;
      expect(privateIp).toBeUndefined();
    });
  });

  describe('WithKeysFlat edgecases', () => {
    it('should require all targeted flat keys when multiple are given (positive)', () => {
      interface Multi {
        a?: string;
        b?: number;
        c: string;
      }
      const x: WithKeysFlat<Multi, 'a' | 'b'> = { a: 'yes', b: 42, c: 'ok' };
      const a: string = x.a;
      const b: number = x.b;
      expect(a).toBe('yes');
      expect(b).toBe(42);
    });

    it('should type-error when one of multiple targeted flat keys is absent (negative)', () => {
      interface Multi {
        a?: string;
        b?: number;
        c: string;
      }
      // @ts-expect-error: Property 'b' is absent
      const x: WithKeysFlat<Multi, 'a' | 'b'> = { a: 'yes', c: 'ok' };
      expect(x).toBeDefined();
    });

    it('should keep an already-required key required without regression (positive)', () => {
      // `name` is already required; WithKeysFlat on it should keep it required without issue
      const x: WithKeysFlat<Instance, 'name'> = {
        name: 'web-1',
        network: { subnet: 's', interface: { publicIpEnabled: true } },
      };
      const name: string = x.name;
      expect(name).toBe('web-1');
    });
  });

  describe('WithKeysDeep edgecases', () => {
    it('should require multiple deep paths under different heads (positive)', () => {
      interface TwoHead {
        a: { x?: string };
        b: { y?: number };
      }
      const x: WithKeysDeep<TwoHead, 'a.x' | 'b.y'> = {
        a: { x: 'ok' },
        b: { y: 42 },
      };
      const xVal: string = x.a.x;
      const yVal: number = x.b.y;
      expect(xVal).toBe('ok');
      expect(yVal).toBe(42);
    });

    it('should type-error when one of multiple deep paths is absent (negative)', () => {
      interface TwoHead {
        a: { x?: string };
        b: { y?: number };
      }
      const x: WithKeysDeep<TwoHead, 'a.x' | 'b.y'> = {
        a: { x: 'ok' },
        // @ts-expect-error: Property 'y' is absent on b
        b: {},
      };
      expect(x).toBeDefined();
    });

    it('should require multiple deep paths under the same head (positive)', () => {
      interface SameHead {
        net: { privateIp?: string; publicIp?: string; subnet: string };
      }
      const x: WithKeysDeep<SameHead, 'net.privateIp' | 'net.publicIp'> = {
        net: { privateIp: '10.0.0.5', publicIp: '54.0.0.5', subnet: 's' },
      };
      const priv: string = x.net.privateIp;
      const pub: string = x.net.publicIp;
      expect(priv).toBe('10.0.0.5');
      expect(pub).toBe('54.0.0.5');
    });

    it('should type-error when one of the same-head deep paths is absent (negative)', () => {
      interface SameHead {
        net: { privateIp?: string; publicIp?: string; subnet: string };
      }
      const x: WithKeysDeep<SameHead, 'net.privateIp' | 'net.publicIp'> = {
        // @ts-expect-error: Property 'publicIp' is absent on net
        net: { privateIp: '10.0.0.5', subnet: 's' },
      };
      expect(x).toBeDefined();
    });
  });

  describe('WithKeys (flat + deep composed)', () => {
    it('should require both a flat key and a deep dot-path (positive)', () => {
      const x: WithKeys<Instance, 'arn', 'network.interface.privateIp'> = {
        arn: 'arn:aws:ec2:...',
        name: 'web-1',
        network: {
          subnet: 's',
          interface: { publicIpEnabled: true, privateIp: '10.0.0.5' },
        },
      };
      const arn: string = x.arn;
      const privateIp: string = x.network.interface.privateIp;
      expect(arn).toBe('arn:aws:ec2:...');
      expect(privateIp).toBe('10.0.0.5');
    });

    it('should type-error when the flat key is absent (negative)', () => {
      // @ts-expect-error: Property 'arn' is absent
      const x: WithKeys<Instance, 'arn', 'network.interface.privateIp'> = {
        name: 'web-1',
        network: {
          subnet: 's',
          interface: { publicIpEnabled: true, privateIp: '10.0.0.5' },
        },
      };
      expect(x).toBeDefined();
    });

    it('should type-error when the deep dot-path is absent (negative)', () => {
      const x: WithKeys<Instance, 'arn', 'network.interface.privateIp'> = {
        arn: 'arn:aws:ec2:...',
        name: 'web-1',
        network: {
          subnet: 's',
          // @ts-expect-error: Property 'privateIp' is absent
          interface: { publicIpEnabled: true },
        },
      };
      expect(x).toBeDefined();
    });

    it('should apply neither requirement when both key sets are empty (never passthrough)', () => {
      const x: WithKeys<Instance, never, never> = {
        name: 'web-1',
        network: { subnet: 's', interface: { publicIpEnabled: true } },
      };
      const arn: string | undefined = x.arn;
      const privateIp: string | undefined = x.network.interface.privateIp;
      expect(arn).toBeUndefined();
      expect(privateIp).toBeUndefined();
    });

    it('should apply only flat keys when deep is never (flat-only mode)', () => {
      const x: WithKeys<Instance, 'arn', never> = {
        arn: 'arn:aws:ec2:...',
        name: 'web-1',
        network: { subnet: 's', interface: { publicIpEnabled: true } },
      };
      const arn: string = x.arn;
      // deep field stays optional
      const privateIp: string | undefined = x.network.interface.privateIp;
      expect(arn).toBe('arn:aws:ec2:...');
      expect(privateIp).toBeUndefined();
    });

    it('should apply only deep keys when flat is never (deep-only mode)', () => {
      const x: WithKeys<Instance, never, 'network.interface.privateIp'> = {
        name: 'web-1',
        network: {
          subnet: 's',
          interface: { publicIpEnabled: true, privateIp: '10.0.0.5' },
        },
      };
      // flat key stays optional
      const arn: string | undefined = x.arn;
      // deep field required
      const privateIp: string = x.network.interface.privateIp;
      expect(arn).toBeUndefined();
      expect(privateIp).toBe('10.0.0.5');
    });
  });
});
