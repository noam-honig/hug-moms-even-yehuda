import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { ApplicationSettings, phoneOption } from '../manage/ApplicationSettings';
import { Context } from '@remult/core';
import { Column } from '@remult/core';

import { DialogService } from '../select-popup/dialog';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

@Component({
  selector: 'app-update-comment',
  templateUrl: './update-comment.component.html',
  styleUrls: ['./update-comment.component.scss']
})
export class GetVolunteerFeedback implements OnInit {
  public args: {
    family: ActiveFamilyDeliveries,
    status?:any,
    showFailStatus?: boolean,
    helpText: (s: ApplicationSettings) => Column
    hideLocation?: boolean,
    title?: string,
    comment: string,
    ok: (comment: string, failStatusId: DeliveryStatus) => void,
    cancel: () => void
  };
  constructor(
    public dialogRef: MatDialogRef<any>,
    private context: Context,
    private dialog: DialogService,
    public settings: ApplicationSettings
  ) {

  }
  addLocationToComment() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(x => {
        if (this.args.comment)
          this.args.comment += '\r\n';
        this.args.comment += `מיקום:
${x.coords.latitude.toFixed(6)},${x.coords.longitude.toFixed(6)}
דיוק: ${x.coords.accuracy.toFixed()}
`
      }, error => {
        this.dialog.Error("שליפת מיקום נכשלה " + error.message);
      });
    }
  }
  status;
  failOptions: DeliveryStatus[] = [
    DeliveryStatus.FailedBadAddress,
    DeliveryStatus.FailedNotHome,
    DeliveryStatus.FailedDoNotWant,
    DeliveryStatus.FailedOther,
    DeliveryStatus.notReady,
    DeliveryStatus.noAnswer,
    DeliveryStatus.alreadyPickedUp,
  ];
  defaultFailStatus = DeliveryStatus.FailedBadAddress;
  getStatusName(s: DeliveryStatus) {
    let r = s.caption;
    if (r.startsWith('לא נמסר, '))
      r = r.substring(9);

    return r;
  }

  async ngOnInit() {
    if (!this.args.title)
      this.args.title = this.settings.lang.thankYou;
    if (this.args.showFailStatus) {

      this.phoneOptions = await ApplicationSettings.getPhoneOptions(this.args.family.id.value);

    }
    if(this.args.status && this.settings.isSytemForMlt()){
      this.defaultFailStatus=DeliveryStatus[this.args.status];
    }   
  }
  phoneOptions: phoneOption[] = [];
  cancel() {
    if (!this.ok) {
      this.args.cancel();
      this.dialogRef.close();
    }

  }
  ok = false;
  confirm() {
    this.ok = true;
    this.dialogRef.close();
    this.args.ok(this.args.comment, this.defaultFailStatus);
    return false;
  }

  helpText() {
    let s = ApplicationSettings.get(this.context);
    return this.args.helpText(s).value;
  }
}


