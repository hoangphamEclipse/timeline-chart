import { timeGraphEntries } from "./test-entries";
//import { timeGraphStates } from "./test-states";
import { timeGraphStatesTest2 } from "./test-states-2-new";
import { timeGraphArrows } from "./test-arrows";
import { TimelineChart } from "timeline-chart/lib/time-graph-model";
import { timeGraphRowIds } from "./test-ids";

export namespace TestDataNew {
    /**
     * Basic entry interface
     */
    export interface Entry {
        /**
         * Unique Id for the entry
         */
        id: number;

        /**
         * Parent entry Id, or -1 if the entry does not have a parent
         */
        parentId: number;

        /**
         * Array of string that represant the content of each column
         */
        labels: string[];
    }

    /**
     * Entry in a time graph
     */
    export interface TimeGraphEntry extends Entry {
        /**
         * Start time of the entry
         */
        start: number;

        /**
         * End time of the entry
         */
        end: number;

        /**
         * Indicate if the entry will have row data
         */
        hasData: boolean;
    }

    /**
     * Time Graph model that will be returned by the server
     */
    export interface TimeGraphModel {
        rows: TimeGraphRow[];
    }

    /**
     * Time graph row described by an array of states for a specific entry
     */
    export interface TimeGraphRow {
        /**
         * Entry Id associated to the state array
         */
        entryId: number;

        /**
         * Array of states
         */
        states: TimeGraphState[];

        /**
         * Array of markers
         */
        annotations: TimeGraphAnnotation[];
    }

    export interface TimeGraphStateStyle {
        color?: number;
        opacity?: number;
        height?: number;
        borderWidth?: number;
        borderColor?: number;
    }

    /**
     * Time graph state
     */
    export interface TimeGraphState {
        /**
         * Start time of the state
         */
        start: number;

        end: number;

        /**
         * Label to apply to the state
         */
        label?: string | undefined;

        style?: TimeGraphStateStyle;

        /**
         * Values associated to the state
         */
        //value: number;

    }

    /**
      * Time graph state
      */
    export interface TimeGraphAnnotation {
        /**
         * Start time of the state
         */
        startTime: number;

        duration: number;

        /**
         * Label to apply to the state
         */
        label: string | null;
    }

    /**
     * Arrow for time graph
     */
    export interface TimeGraphArrow {
        /**
         * Source entry Id for the arrow
         */
        sourceId: number;

        /**
         * Destination entry Id for the arrow
         */
        destinationId: number;

        /**
         * Start time of the arrow
         */
        startTime: number;

        /**
         * Duration of the arrow
         */
        duration: number;

        /**
         * Value associated to the arrow
         */
        value: number;

        /**
         * Optional information on the style to format this arrow
         */
        style: string;
    }


}

export class TestDataProvider {
    public absoluteStart: bigint;
    public totalLength: bigint;
    protected timeGraphEntries: object[];
    protected timeGraphRows: object[];
    protected canvasDisplayWidth: number;

    constructor(canvasDisplayWidth: number) {
        this.timeGraphEntries = timeGraphEntries.model.entries;
        this.timeGraphRows = timeGraphStatesTest2.model.rows;
        this.totalLength = BigInt(0);

        this.canvasDisplayWidth = canvasDisplayWidth;

        this.timeGraphEntries.forEach((entry: TestDataNew.TimeGraphEntry, rowIndex: number) => {
            const row = timeGraphStatesTest2.model.rows.find(row => row.entryId === entry.id);
            if (!this.absoluteStart) {
                this.absoluteStart = BigInt(entry.start);
            } else if (BigInt(entry.start) < this.absoluteStart) {
                this.absoluteStart = BigInt(entry.start);
            }
            if (row) {
                // @ts-ignore
                row.states.forEach((state: TestDataNew.TimeGraphState, stateIndex: number) => {
                    const end = BigInt(state.end - entry.start);
                    this.totalLength = end > this.totalLength ? end : this.totalLength;
                });
            }
        })
    }

    getRowIds(): number[] {
        const rowIds: number[] = [];
        timeGraphEntries.model.entries.forEach(entry => {
            rowIds.push(entry.id);
        });
        return rowIds;
    }

    fetchTimeGraphData(opts: { range?: TimelineChart.TimeGraphRange, resolution?: number }): TimelineChart.TimeGraphModel {
        const rows: TimelineChart.TimeGraphRowModel[] = [];
        const rangeEvents: TimelineChart.TimeGraphAnnotation[] = [];

        const chartStart = this.absoluteStart;
        const rowIds = timeGraphRowIds.ids;
        const orderedRows = this.timeGraphRowsOrdering(rowIds);
        timeGraphEntries.model.entries.forEach((entry: any, rowIndex: number): void => {
            let gapStyle;
            if (!entry.style) {
                gapStyle = this.getDefaultForGapStyle();
            } else {
                gapStyle = entry.style;
            }

            const states: TimelineChart.TimeGraphState[] = [];
            const annotations: TimelineChart.TimeGraphAnnotation[] = [];
            const row = orderedRows.find(row => row.entryId === entry.id);
            let prevPossibleState = entry.start;
            let nextPossibleState = entry.end;
            if (row) {
                row.states.forEach((state: any, stateIndex: number) => {
                    const end = BigInt(state.end) - chartStart;
                    states.push({
                        id: row.entryId + '-' + stateIndex,
                        label: state.label,
                        range: {
                            start: BigInt(state.start) - chartStart,
                            end
                        },
                        data: {
                            style: state.style
                        }
                    });
                    //this.totalRange = this.totalRange < end ? end : this.totalRange;
                    if (stateIndex === 0) {
                        prevPossibleState = BigInt(state.start) - chartStart;
                    }
                    if (stateIndex === row.states.length - 1) {
                        nextPossibleState = BigInt(state.end) - chartStart;
                    }
                });

                if (states.length > 0) {
                    rows.push({
                        id: entry.id,
                        name: entry.labels[0],
                        range: {
                            start: BigInt(entry.start) - chartStart,
                            end: BigInt(entry.end) - chartStart
                        },
                        states,
                        annotations,
                        data: {
                            type: entry.type
                        },
                        prevPossibleState,
                        nextPossibleState,
                        gapStyle
                    });
                }
            }
        });
        let arrows: TimelineChart.TimeGraphArrow[] = [];
        timeGraphArrows.forEach(arrow => {
            arrows.push({
                sourceId: arrow.sourceId,
                destinationId: arrow.destinationId,
                range: {
                    start: arrow.range.start - this.absoluteStart,
                    end: arrow.range.end - this.absoluteStart
                }
            });
        });

        return {
            id: "",
            arrows,
            rows,
            rangeEvents,
            totalLength: this.totalLength
        };
    }
    
    private timeGraphRowsOrdering(orderedIds: number[]): TestDataNew.TimeGraphRow[] {
        const newTimeGraphRows: TestDataNew.TimeGraphRow[] = [];

        orderedIds.forEach(id => {
            
            // @ts-ignore
            const timeGraphRow = this.timeGraphRows.find(row => row.entryId === id);
            
            if (timeGraphRow) {
                const newRow = timeGraphRow as TestDataNew.TimeGraphRow;
                newTimeGraphRows.push(newRow);
            } else {
                const emptyRow: TestDataNew.TimeGraphRow = { states: [{ start: 0, end: 0, label: '' }], entryId: id, annotations: [] };
                newTimeGraphRows.push(emptyRow);
            }
        });

        return newTimeGraphRows;
    }

    private getDefaultForGapStyle() {
        // Default color and height for the GAP state
        return {
            parentKey: '',
            values: {
                'background-color': '#CACACA',
                height: 1.0
            }
        };
    }
}
