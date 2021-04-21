import {
  PasswordFieldEnum,
  createChangeHandler,
  createResetHandler,
} from '../../../features/datasources/utils/passwordHandlers';

export class MssqlConfigCtrl {
  static templateUrl = 'partials/config.html';

  // Set through angular bindings
  declare current: any;

  onPasswordReset: ReturnType<typeof createResetHandler>;
  onPasswordChange: ReturnType<typeof createChangeHandler>;
  showUserCredentials: boolean;
  showTlsConfig: boolean;

  /** @ngInject */
  constructor($scope: any) {
    this.current = $scope.ctrl.current;
    this.current.jsonData.encrypt = this.current.jsonData.encrypt || 'false';
    this.current.jsonData.certificate = this.current.jsonData.certificate || '';
    this.current.jsonData.tlsSkipVerify = this.current.jsonData.tlsSkipVerify || false;
    this.current.jsonData.hostNameInCertificate = this.current.jsonData.hostNameInCertificate || '';
    this.current.jsonData.authenticationType = this.current.jsonData.authenticationType || 'SQL Server Authentication';
    this.onPasswordReset = createResetHandler(this, PasswordFieldEnum.Password);
    this.onPasswordChange = createChangeHandler(this, PasswordFieldEnum.Password);
    this.onAuthenticationTypeChange();
    this.onEncryptChange();
  }

  onAuthenticationTypeChange() {
    // This is using the fallback in https://github.com/denisenkom/go-mssqldb to use Windows Auth if login/user id is empty.
    if (this.current.jsonData.authenticationType === 'Windows Authentication') {
      this.current.user = '';
      this.current.password = '';
    }

    this.showUserCredentials = this.current.jsonData.authenticationType !== 'Windows Authentication';
  }

  onEncryptChange() {
    this.showTlsConfig = this.current.jsonData.encrypt === 'true';
  }
}
