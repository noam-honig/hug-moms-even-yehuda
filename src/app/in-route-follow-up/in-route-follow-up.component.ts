import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Context, Column, DataControlInfo, StringColumn, EntityWhere } from '@remult/core';
import { InRouteHelpers, HelperCommunicationHistory } from './in-route-helpers';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { use } from '../translate';
import { Helpers } from '../helpers/helpers';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { helperHistoryInfo } from '../delivery-history/delivery-history.component';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { saveToExcel } from '../shared/saveToExcel';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';
import { Roles } from '../auth/roles';

@Component({
  selector: 'app-in-route-follow-up',
  templateUrl: './in-route-follow-up.component.html',
  styleUrls: ['./in-route-follow-up.component.scss']
})
export class InRouteFollowUpComponent implements OnInit {

  constructor(private context: Context, public settings: ApplicationSettings, private busy: BusyService,private dialog:DialogService) { }

  searchString: string = '';
  clearSearch() {
    this.searchString = '';
    this.helpers.reloadData();
  }

  helpers = this.context.for(InRouteHelpers).gridSettings({
    get: {
      limit: 25,
      where: h => {
        let r = h.name.isContains(this.searchString);
        return r.and(this.currentOption.where(h));
      }
    },
    rowsInPage: 25,
    knowTotalRows: true,
    showFilter: true,
    numOfColumnsInGrid: 99,
    gridButtons: [{
      name: use.language.exportToExcel,
      click: () => saveToExcel(this.settings, this.context.for(InRouteHelpers), this.helpers, "מתנדבים בדרך", this.busy)
    }],
    rowCssClass: x => {
      if ((!x.seenFirstAssign.value) && (!x.lastCommunicationDate.value || x.lastCommunicationDate.value < daysAgo(3)))
        return 'communicationProblem';
      else if ((x.minAssignDate.value < daysAgo(5)) && (!x.lastCommunicationDate.value || x.lastCommunicationDate.value < daysAgo(5)))
        return 'addressProblem';
      else
        return '';
    },
    rowButtons: [{
      textInMenu: () => use.language.assignDeliveryMenu,
      icon: 'list_alt',
      showInLine: true,
      visible: h => !h.isNew(),
      click: async s => {
        s.showAssignment();
      }
    }, {
      name: use.language.ActiveDeliveries,
      visible: h => !h.isNew(),
      click: async h => {
        this.context.openDialog(GridDialogComponent, x => x.args = {
          title: use.language.deliveriesFor + ' ' + h.name.value,
          buttons: [
            {
              text: 'תכתובות',
              click: () => h.showHistory()
            },
            {
              text: 'שיוך משלוחים',
              click: () => h.showAssignment()
            }
          ],
          settings: this.context.for(ActiveFamilyDeliveries).gridSettings({
            numOfColumnsInGrid: 7,
            knowTotalRows: true,
            rowCssClass: fd => fd.deliverStatus.getCss(),

            columnSettings: fd => {
              let r: DataControlInfo[] = [
                fd.name,
                fd.address,
                { column: fd.internalDeliveryComment, width: '400' },

                fd.courierAssingTime,
                fd.deliverStatus,
                fd.deliveryStatusDate,
                fd.basketType,
                fd.quantity,
                fd.distributionCenter,
                fd.courierComments,
                { column: fd.courierComments, width: '400' }
              ]
              r.push(...fd.columns.toArray().filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.defs.caption.localeCompare(b.defs.caption)));
              return r;
            },

            where: fd => fd.courier.isEqualTo(h.id).and(fd.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)),
            orderBy: fd => [{ column: fd.deliveryStatusDate, descending: true }],
            rowsInPage: 25

          })
        });
      }
    },
    {
      name: 'תכתובות',
      click: async h => {
        h.showHistory();
      }
    },
    {
      name: 'הוסף תכתובת',
      click: async s => {
        s.addCommunication(() => { });
      }
    },
    {
      name: use.language.volunteerInfo,
      click: async s => {
        let h = await this.context.for(Helpers).findId(s.id);
        h.displayEditDialog(this.dialog, this.busy);
      }
    },
    {
      name: use.language.freezeHelper,
      visible: () => this.context.isAllowed(Roles.admin)&&this.settings.isSytemForMlt(),
      click: async h => this.editFreezeDate(h)
    },]
  });

  ngOnInit() {
  }

  radioOption: filterOptions[] = [
    {
      text: 'כולם',
      where: () => undefined
    },
    {
      text: 'לא ראו אף שיוך',
      where: s => s.seenFirstAssign.isEqualTo(false).and(s.minAssignDate.isLessOrEqualTo(daysAgo(2)))
    },
    {
      text: 'שיוך ראשון לפני יותר מ 5 ימים',
      where: s => s.minAssignDate.isLessOrEqualTo(daysAgo(5))
    }
  ]
  currentOption = this.radioOption[0];

  async doSearch() {
    if (this.helpers.currentRow && this.helpers.currentRow.wasChanged())
      return;
    this.busy.donotWait(async () =>
      await this.helpers.reloadData());
  }

  private freezeDateEntry(h: InRouteHelpers) {
    let r: DataControlInfo<Helpers>[] = [
      {
        column: h.frozenTill,
        width: '150'
      },
      {
        column: h.internalComment,
        width: '150'
      },
    ];
    return r;
  }

  async editFreezeDate(h: InRouteHelpers) {
    this.context.openDialog(InputAreaComponent, x => x.args = {
      title: use.language.freezeHelper,
      ok: async () => {
        let helper = await this.context.for(Helpers).findId(h.id);
        helper.frozenTill.value = h.frozenTill.value;
        helper.internalComment.value = h.internalComment.value;
        await helper.save();
        this.helpers.reloadData();
      },
      cancel: () => {
      },
      settings: {
        columnSettings: () => this.freezeDateEntry(h)
      }
    });
  }
}

interface filterOptions {
  text: string,
  where: EntityWhere<InRouteHelpers>
}
function daysAgo(num: number) {
  let d = new Date();
  d.setDate(d.getDate() - num);
  return d;
}