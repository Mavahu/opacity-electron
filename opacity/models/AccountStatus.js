class Account {
  static toObject(data) {
    const acc = new Account();

    acc.createdAt = data['createdAt'];
    acc.updatedAt = data['updatedAt'];
    acc.expirationDate = data['expirationDate'];
    acc.monthsInSubscription = data['monthsInSubscription'];
    acc.storageLimit = data['storageLimit'];
    acc.storageUsed = data['storageUsed'];
    acc.totalFolders = data['totalFolders'];
    acc.totalMetadataSizeInMB = data['totalMetadataSizeInMB'];
    acc.maxFolders = data['maxFolders'];
    acc.maxMetadataSizeInMB = data['maxMetadataSizeInMB'];

    return acc;
  }
}

class AccountStatus {
  static toObject(data) {
    const accStatus = new AccountStatus();

    accStatus.paymentStatus = data['paymentStatus'];
    accStatus.account = Account.toObject(data['account']);

    return accStatus;
  }
}

export default AccountStatus
