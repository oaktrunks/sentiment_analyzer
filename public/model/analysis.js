export class Analysis {
  constructor(data) {
    this.tag = data.tag;
    this.createdAt = data.createdAt;
    this.id = data.id;
    this.text = data.text;
    this.neg = data.neg;
    this.neu = data.neu;
    this.pos = data.pos;
    this.compound = data.compound;
  }
}
