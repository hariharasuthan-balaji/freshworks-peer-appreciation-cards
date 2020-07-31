import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inlineSvgFor } from 'ember-svg-jar/utils/make-svg';
import html2canvas from 'html2canvas';
import { inject as service } from '@ember/service';

const CARD_DESC_CHAR_LIMIT = 360;

export default class CardController extends Controller {
  @service notifications;

  @tracked
  cardDesc = "I am giving you this because...";

  textAreaAutoSize = (event) => {
    let element = event.target;
    let offset = element.offsetHeight - element.clientHeight;

    if ((event.target.scrollHeight + offset) < this.textAreaMaxScrollHeight) {
      event.target.style.height = 'auto';
      event.target.style.height = event.target.scrollHeight + offset + 'px';
    }
  }

  wrapText(context, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';

    for(var n = 0; n < words.length; n++) {
      var testLine = line + words[n] + ' ';
      var metrics = context.measureText(testLine);
      var testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      }
      else {
        line = testLine;
      }
    }
    context.fillText(line, x, y);
  }

  async generateCanvasFromDiv()  {
    // eslint-disable-next-line no-undef
    let oldTopLeftIcon = inlineSvgFor('card-top-left', (assetId) => require(`ember-svg-jar/inlined/${assetId}`).default, { class: "card-icon-top-left card-icon--top-left"});
    let newTopLeftIcon = oldTopLeftIcon.replace(/fill="R"/g, `fill="${this.model.color}"`);
    newTopLeftIcon = newTopLeftIcon.replace(/stroke="R"/g, `stroke="${this.model.color}"`);
    // eslint-disable-next-line no-undef
    let oldTopBottomIcon = inlineSvgFor('card-bottom-left', (assetId) => require(`ember-svg-jar/inlined/${assetId}`).default, { class: "card-icon-bottom-left card-icon card-icon--bottom-left"});
    let newTopBottomIcon = oldTopBottomIcon.replace(/fill="R"/g, `fill="${this.model.color}"`);
    newTopBottomIcon = newTopBottomIcon.replace(/stroke="R"/g, `stroke="${this.model.color}"`);

    let node = document.querySelector('.appreciation-card');
    let clone = node.cloneNode(true);

    let appreciationTextDesc = clone.querySelector('.card-details-desc textarea').value.substring(0, CARD_DESC_CHAR_LIMIT);
    clone.querySelector('.card-details-desc textarea').value = "";
    clone.querySelector(".card-icon-top-left").outerHTML = newTopLeftIcon;
    clone.querySelector(".card-icon-bottom-left").outerHTML = newTopBottomIcon;

    let dummyDiv = document.querySelector('#dummy-div');
    dummyDiv.style.display = "flex"
    dummyDiv.appendChild(clone);

    let canvas = await html2canvas(dummyDiv);
    let ctx = canvas.getContext("2d");
    
    ctx.font = "25px Kalam";
    ctx.fillStyle = "#52575C";
    this.wrapText(ctx, appreciationTextDesc, 400, 230, 600, 40);

    document.querySelector("#dummy-div").style.display = "none"
    document.querySelector("#dummy-div").removeChild(clone);

    return { canvas, ctx };
  }

  selectText(element) {
    var doc = document;
    if (doc.body.createTextRange) {
        let range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } else if (window.getSelection) {
        var selection = window.getSelection();
        let range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

  @action
  setAutosizeListener(rootElement) {
    this.textAreaMaxScrollHeight = rootElement.clientHeight;

    let element = rootElement.querySelector('textarea');
    element.addEventListener('input', this.textAreaAutoSize);
  }
  @action
  removeAutosizeListener(rootElement) {
    let element = rootElement.querySelector('textarea');
    element.removeEventListener('input', this.textAreaAutoSize);
  }

  @action
  async downloadCard() {
    let { canvas } = await this.generateCanvasFromDiv();

    // document.body.appendChild(canvas);

    let link = document.createElement('a');
    link.download = 'appreciation-card.png';
    link.href = canvas.toDataURL();
    link.click();

    this.notifications.success("Your card has been successfully downloaded. Feel free to share the card in slack, workplace...", {
      autoClear: true,
      clearDuration: 10000
    });
  }

  @action
  async copyToClipboard() {
    let { canvas } = await this.generateCanvasFromDiv();

    if (window.ClipboardItem) {
      canvas.toBlob(blob => {
        navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
      });
    } else {
      var img = document.createElement('img');
      img.src = canvas.toDataURL()
      
      var div = document.createElement('div');
      div.contentEditable = true;
      div.appendChild(img);
      document.body.appendChild(div);
  
      // do copy
      this.selectText(div);
      document.execCommand('Copy');
      document.body.removeChild(div);
    }

    this.notifications.clearAll();
    this.notifications.info("Your card has been copied to clipboard. Feel free to paste now in slack, workplace...", {
      autoClear: true,
      clearDuration: 10000
    });

  }

  @action
  goBack() {
    this.transitionToRoute("index");
  }

  @action
  cardDescKeyPress(text) {
    if (text.length > CARD_DESC_CHAR_LIMIT) {
      this.notifications.clearAll();
      this.notifications.warning(`Card message must be no longer than ${CARD_DESC_CHAR_LIMIT} characters`, {
        autoClear: true,
      });
    }
    this.cardDesc = text.substring(0, CARD_DESC_CHAR_LIMIT);
  }
}