import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { adminConfig } from './app/app.config';
registerLocaleData(localeEsPe);
bootstrapApplication(App, adminConfig).catch((err) => console.error(err));
