import { TimeGraphAxis } from "timeline-chart/lib/layer/time-graph-axis";
import { TimeGraphChart } from "timeline-chart/lib/layer/time-graph-chart";
import { TimeGraphUnitController } from "timeline-chart/lib/time-graph-unit-controller";
import { TimeGraphRowController } from "timeline-chart/lib/time-graph-row-controller";
import { TimeGraphNavigator } from "timeline-chart/lib/layer/time-graph-navigator";
import { TimeGraphChartCursors } from "timeline-chart/lib/layer/time-graph-chart-cursors";
import { TimeGraphChartSelectionRange } from "timeline-chart/lib/layer/time-graph-chart-selection-range";
import { TimeGraphAxisCursors } from "timeline-chart/lib/layer/time-graph-axis-cursors";
import { TimeGraphContainer } from "timeline-chart/lib/time-graph-container";
import { TimelineChart } from "timeline-chart/lib/time-graph-model";
import { TimeGraphStateStyle } from "timeline-chart/lib/components/time-graph-state";
import { TestDataProvider } from "./test-data-provider";
import { TimeGraphChartGrid } from "timeline-chart/lib/layer/time-graph-chart-grid";
import { TimeGraphVerticalScrollbar } from "timeline-chart/lib/layer/time-graph-vertical-scrollbar";
import { TimeGraphChartArrows } from "timeline-chart/lib/layer/time-graph-chart-arrows";
import { TimeGraphRangeEventsLayer } from "timeline-chart/lib/layer/time-graph-range-events-layer";

const styleConfig = {
    mainWidth: 1800,
    mainHeight: 820,
    naviBackgroundColor: 0xf7eaaf,
    chartBackgroundColor: 0xf9f6e8,
    cursorColor: 0xb77f09
}

const styleMap = new Map<string, TimeGraphStateStyle>();
const rowHeight = 16;

const container = document.getElementById('main');
if (!container) {
    throw (`No container available.`);
}
container.innerHTML = '';
container.style.width = styleConfig.mainWidth + "px";

const testDataProvider = new TestDataProvider(styleConfig.mainWidth);
let timeGraph = testDataProvider.fetchTimeGraphData({});
const traceStart = testDataProvider.absoluteStart;
// const testRange = {
//     start: BigInt(1673902684000000000) - traceStart,
//     end: BigInt(1673902684500000000) - traceStart
// } as TimelineChart.TimeGraphRange ;

const testRange = {
    start: BigInt(1673902683874348300) - traceStart,
    end: BigInt(1673902684630067200) - traceStart
} as TimelineChart.TimeGraphRange ;

const worldRange = {
    start: BigInt(176654678),
    end: BigInt(935575987)
} as TimelineChart.TimeGraphRange ;

const unitController = new TimeGraphUnitController(timeGraph.totalLength, testRange);
//unitController.viewRange = testRange;
unitController.numberTranslator = (theNumber: bigint) => {
    const originalStart = traceStart;
    theNumber += originalStart;
    const zeroPad = (num: bigint) => String(num).padStart(3, '0');
    const seconds = theNumber / BigInt(1000000000);
    const millis = zeroPad((theNumber / BigInt(1000000)) % BigInt(1000));
    const micros = zeroPad((theNumber / BigInt(1000)) % BigInt(1000));
    const nanos = zeroPad(theNumber % BigInt(1000));
    return seconds + '.' + millis + ' ' + micros + ' ' + nanos;
};
unitController.worldRenderFactor = 0.25;

const providers = {
    rowProvider: () => {
        return {
            rowIds : testDataProvider.getRowIds() 
        };
    },
    dataProvider: (range: TimelineChart.TimeGraphRange, resolution: number) => {
        const newRange: TimelineChart.TimeGraphRange = range;
        const newResolution: number = resolution * 0.1;
        timeGraph = testDataProvider.fetchTimeGraphData({ range: newRange, resolution: newResolution });
        return {
            rows: timeGraph.rows,
            range: newRange,
            resolution: newResolution
        };
    },
    stateStyleProvider: (model: TimelineChart.TimeGraphState) => {
        const styles: TimeGraphStateStyle[] = [
            {
                color: 0x11ad1b,
                height: rowHeight * 0.8
            }, {
                color: 0xbc2f00,
                height: rowHeight * 0.7
            }, {
                color: 0xccbf5d,
                height: rowHeight * 0.6
            }
        ];
        let style: TimeGraphStateStyle | undefined = styles[0];
        if (model.data && model.data.value) {
            const val = model.data.value;
            style = styleMap.get(val);
            if (!style) {
                style = styles[(styleMap.size % styles.length)];
                styleMap.set(val, style);
            }
        }
        return {
            color: style.color,
            height: style.height,
            borderWidth: model.selected ? 1 : 0,
            minWidthForLabels: 100
        };
    },
    rowStyleProvider: (row: TimelineChart.TimeGraphRowModel) => {
        return {
            backgroundColor: 0xe0ddcf,
            backgroundOpacity: row.selected ? 0.6 : 0,
            lineColor: row.data && row.data.hasStates ? 0xdddddd : 0xaa4444,
            lineThickness: row.data && row.data.hasStates ? 1 : 3
        }
    },
    rowAnnotationStyleProvider: (annotation: TimelineChart.TimeGraphAnnotation) => {
        return {
            color: annotation.data?.color,
            size: 7 * (annotation.data && annotation.data.height ? annotation.data.height : 1.0),
            symbol: annotation.data?.symbol,
            verticalAlign: annotation.data?.verticalAlign,
            opacity: annotation.data?.opacity
        }
    }
}

const totalHeight = timeGraph.rows.length * rowHeight;
const rowController = new TimeGraphRowController(rowHeight, totalHeight);

const axisHTMLContainer = document.createElement('div');
axisHTMLContainer.id = 'main_axis';
container.appendChild(axisHTMLContainer);

const axisCanvas = document.createElement('canvas');
const timeGraphAxisContainer = new TimeGraphContainer({
    height: 30,
    width: styleConfig.mainWidth,
    id: timeGraph.id + '_axis',
    backgroundColor: 0xffffff
}, unitController, axisCanvas);
axisHTMLContainer.appendChild(timeGraphAxisContainer.canvas);

const timeAxisCursors = new TimeGraphAxisCursors('timeGraphAxisCursors', { color: styleConfig.cursorColor });
const timeAxisLayer = new TimeGraphAxis('timeGraphAxis', { color: styleConfig.naviBackgroundColor, verticalAlign: 'bottom'});
timeGraphAxisContainer.addLayers([timeAxisLayer, timeAxisCursors]);

const chartHTMLContainer = document.createElement('div');
chartHTMLContainer.id = 'main_chart';
container.appendChild(chartHTMLContainer);

const chartCanvas = document.createElement('canvas');
chartCanvas.tabIndex = 1;

const timeGraphChartContainer = new TimeGraphContainer({
    id: timeGraph.id + '_chart',
    height: styleConfig.mainHeight,
    width: styleConfig.mainWidth,
    backgroundColor: styleConfig.chartBackgroundColor
}, unitController, chartCanvas);
chartHTMLContainer.appendChild(timeGraphChartContainer.canvas);

const timeGraphChartGridLayer = new TimeGraphChartGrid('timeGraphGrid', rowHeight);
const timeGraphChart = new TimeGraphChart('timeGraphChart', providers, rowController);
const timeGraphChartArrows = new TimeGraphChartArrows('timeGraphChartArrows', rowController);
const timeGraphSelectionRange = new TimeGraphChartSelectionRange('chart-selection-range', { color: styleConfig.cursorColor });
const timeGraphChartCursors = new TimeGraphChartCursors('chart-cursors', timeGraphChart, rowController, { color: styleConfig.cursorColor });
const timeGraphChartRangeEvents = new TimeGraphRangeEventsLayer('timeGraphChartRangeEvents', providers);

timeGraphChartContainer.addLayers([timeGraphChartGridLayer, timeGraphChart,
    timeGraphChartArrows, timeGraphSelectionRange,
    timeGraphChartCursors, timeGraphChartRangeEvents]);

timeGraphChart.registerMouseInteractions({
    // click: el => {
    //     console.log('click: ' + el.constructor.name, el.model);
    // },
    // mouseover: el => {
    //     console.log('mouseover: ' + el.constructor.name, el.model);
    // },
    // mouseout: el => {
    //     console.log('mouseout: ' + el.constructor.name, el.model);
    // },
    // mousedown: el => {
    //     console.log('mousedown: ' + el.constructor.name, el.model);
    // },
    // mouseup: el => {
    //     console.log('mouseup: ' + el.constructor.name, el.model);
    // }
});

timeGraphChartArrows.addArrows(timeGraph.arrows, testDataProvider.getRowIds());
timeGraphChartRangeEvents.addRangeEvents(timeGraph.rangeEvents);

const cursorReset = document.getElementById('cursor-reset');
if (cursorReset) {
    cursorReset.addEventListener('click', () => {
        timeGraphChartCursors.removeCursors();
    });
}

const naviEl = document.createElement('div');
naviEl.id = 'navi';
container.appendChild(naviEl);
const naviContainer = new TimeGraphContainer({
    width: styleConfig.mainWidth,
    height: 10,
    id: 'navi',
    backgroundColor: styleConfig.naviBackgroundColor
}, unitController);
const navi = new TimeGraphNavigator('timeGraphNavigator');
naviContainer.addLayers([navi]);
naviEl.appendChild(naviContainer.canvas);

const vscrollElement = document.getElementById('main-vscroll');
if (vscrollElement) {
    const verticalScrollContainer = new TimeGraphContainer({
        width: 10,
        height: styleConfig.mainHeight,
        id: 'vscroll',
        backgroundColor: styleConfig.naviBackgroundColor
    }, unitController);
    const vscroll = new TimeGraphVerticalScrollbar('timeGraphVerticalScrollbar', rowController);
    verticalScrollContainer.addLayers([vscroll]);
    vscrollElement.appendChild(verticalScrollContainer.canvas);
}

document.addEventListener("DOMContentLoaded", function(event) { 
    var delayInMilliseconds = 5000; // 5 second

    unitController.worldRange = worldRange;

    setTimeout(function() {
        const start = performance.now();
        // @ts-ignore
        timeGraphChart.adjustZoom(600, true);
        const end = performance.now();
    }, delayInMilliseconds);
});