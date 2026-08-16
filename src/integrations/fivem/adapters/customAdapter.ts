import { VRPAdapter } from './vrpAdapter.js';

export class QBCoreAdapter extends VRPAdapter {
  public override name = 'QBCore Framework Bridge';
}

export class ESXAdapter extends VRPAdapter {
  public override name = 'ESX Legacy Framework Bridge';
}

export class CustomFiveMAdapter extends VRPAdapter {
  public override name = 'Custom FiveM Framework Bridge';
}
