// Recorder — session action replay and export

export class Recorder {
  constructor(logs = []) {
    this.logs = logs;
  }

  export() {
    return {
      logs: this.logs,
      replay: this.logs.map((l) => ({ type: l.type, payload: l.payload })),
      duration: this.logs.length ? this.logs[this.logs.length - 1].ts - this.logs[0].ts : 0,
    };
  }

  toJSON() {
    return JSON.stringify(this.export(), null, 2);
  }
}
