import { ChangeDetectorRef, Component, ViewChild, ViewEncapsulation } from '@angular/core';
import * as go from 'gojs';
import { DataSyncService, DiagramComponent, PaletteComponent } from 'gojs-angular';
import * as _ from 'lodash';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class AppComponent {

  @ViewChild('myDiagram', { static: true }) public myDiagramComponent: DiagramComponent;
  @ViewChild('myPalette', { static: true }) public myPaletteComponent: PaletteComponent;


  

  // initialize diagram / templates
  public initDiagram(): go.Diagram {

    
  const $ = go.GraphObject.make;
  const showLinkLabel= function (e) {
    var label = e.subject.findObject("LABEL");
    if (label !== null) label.visible = (e.subject.fromNode.data.category === "Conditional");
  }
  
  const dia = $(go.Diagram, {
      'undoManager.isEnabled': true,
      "LinkDrawn": showLinkLabel,  // this DiagramEvent listener is defined below
      "LinkRelinked": showLinkLabel,
      model: $(go.GraphLinksModel,
        {
          linkToPortIdProperty: 'toPort',
          linkFromPortIdProperty: 'fromPort',
          linkKeyProperty: 'key' // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
        }
      ),

    });

    var makePort= function (name : string, align: go.Spot, spot: go.Spot, output : boolean, input : boolean) {
      var horizontal = align.equals(go.Spot.Top) || align.equals(go.Spot.Bottom);
      // the port is basically just a transparent rectangle that stretches along the side of the node,
      // and becomes colored when the mouse passes over it
      return  $(go.Shape,
        {
          fill: "transparent",  // changed to a color in the mouseEnter event handler
          strokeWidth: 0,  // no stroke
          width: horizontal ? NaN : 8,  // if not stretching horizontally, just 8 wide
          height: !horizontal ? NaN : 8,  // if not stretching vertically, just 8 tall
          alignment: align,  // align the port on the main Shape
          stretch: (horizontal ? go.GraphObject.Horizontal : go.GraphObject.Vertical),
          portId: name,  // declare this object to be a "port"
          fromSpot: spot,  // declare where links may connect at this port
          fromLinkable: output,  // declare whether the user may draw links from here
          toSpot: spot,  // declare where links may connect at this port
          toLinkable: input,  // declare whether the user may draw links to here
          cursor: "pointer",  // show a different cursor to indicate potential link point
          mouseEnter: function(e:go.InputEvent, port) {  // the PORT argument will be this Shape
            if (!e.diagram.isReadOnly) port.fill = "rgba(255,0,255,0.5)";
          },
          mouseLeave: function(e:go.InputEvent, port) {
            port.fill = "transparent";
          }
        });
    }


    const textStyle =function () {
      return {
        font: "bold 11pt Lato, Helvetica, Arial, sans-serif",
        stroke: "#F8F8F8"
      }
    }

    const nodeStyle=function () {
      return [
        // The Node.location comes from the "loc" property of the node data,
        // converted by the Point.parse static method.
        // If the Node.location is changed, it updates the "loc" property of the node data,
        // converting back using the Point.stringify static method.
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        {
          // the Node.location is at the center of each node
          locationSpot: go.Spot.Center
        }
      ];
    }

    // define the Node template
    dia.nodeTemplate =
      $(go.Node, 'Spot',
        
        $(go.Panel, "Auto",
          $(go.Shape, "Rectangle",
            { fill: "#282c34", stroke: "#00A9C9", strokeWidth: 3.5 },
            new go.Binding("figure", "figure")),
          $(go.TextBlock, textStyle(),
            {
              margin: 8,
              maxSize: new go.Size(160, NaN),
              wrap: go.TextBlock.WrapFit,
              editable: true
            },
            new go.Binding("text").makeTwoWay())
        ),
        // four named ports, one on each side:
        makePort("T", go.Spot.Top, go.Spot.TopSide, false, true),
        makePort("L", go.Spot.Left, go.Spot.LeftSide, true, true),
        makePort("R", go.Spot.Right, go.Spot.RightSide, true, true),
        makePort("B", go.Spot.Bottom, go.Spot.BottomSide, true, false)
      );

      dia.nodeTemplateMap.add("Conditional",
      $(go.Node, "Table", nodeStyle(),
        // the main object is a Panel that surrounds a TextBlock with a rectangular Shape
        $(go.Panel, "Auto",
          $(go.Shape, "Diamond",
            { fill: "#282c34", stroke: "#00A9C9", strokeWidth: 3.5 },
            new go.Binding("figure", "figure")),
          $(go.TextBlock, textStyle(),
            {
              margin: 8,
              maxSize: new go.Size(160, NaN),
              wrap: go.TextBlock.WrapFit,
              editable: true
            },
            new go.Binding("text").makeTwoWay())
        ),
        // four named ports, one on each side:
        makePort("T", go.Spot.Top, go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, go.Spot.Left, true, true),
        makePort("R", go.Spot.Right, go.Spot.Right, true, true),
        makePort("B", go.Spot.Bottom, go.Spot.Bottom, true, false)
      ));

      dia.nodeTemplateMap.add("Start",
      $(go.Node, "Table", nodeStyle(),
        $(go.Panel, "Spot",
          $(go.Shape, "Circle",
            { desiredSize: new go.Size(70, 70), fill: "#282c34", stroke: "#09d3ac", strokeWidth: 3.5 }),
          $(go.TextBlock, "Start", textStyle(),
            new go.Binding("text"))
        ),
        // three named ports, one on each side except the top, all output only:
        makePort("L", go.Spot.Left, go.Spot.Left, true, false),
        makePort("R", go.Spot.Right, go.Spot.Right, true, false),
        makePort("B", go.Spot.Bottom, go.Spot.Bottom, true, false)
      ));

      dia.nodeTemplateMap.add("End",
      $(go.Node, "Table", nodeStyle(),
        $(go.Panel, "Spot",
          $(go.Shape, "Circle",
            { desiredSize: new go.Size(60, 60), fill: "#282c34", stroke: "#DC3C00", strokeWidth: 3.5 }),
          $(go.TextBlock, "End", textStyle(),
            new go.Binding("text"))
        ),
        // three named ports, one on each side except the bottom, all input only:
        makePort("T", go.Spot.Top, go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, go.Spot.Left, false, true),
        makePort("R", go.Spot.Right, go.Spot.Right, false, true)
      ));
    
      dia.linkTemplate =
      $(go.Link,  // the whole link panel
        {
          routing: go.Link.AvoidsNodes,
          curve: go.Link.JumpOver,
          corner: 5, toShortLength: 4,
          relinkableFrom: true,
          relinkableTo: true,
          reshapable: true,
          resegmentable: true,
          // mouse-overs subtly highlight links:
          mouseEnter: function(e, link:go.ObjectData) { link.findObject("HIGHLIGHT").stroke = "rgba(30,144,255,0.2)"; },
          mouseLeave: function(e, link:go.ObjectData) { link.findObject("HIGHLIGHT").stroke = "transparent"; },
          selectionAdorned: false
        },
        new go.Binding("points").makeTwoWay(),
        $(go.Shape,  // the highlight shape, normally transparent
          { isPanelMain: true, strokeWidth: 8, stroke: "transparent", name: "HIGHLIGHT" }),
        $(go.Shape,  // the link path shape
          { isPanelMain: true, stroke: "gray", strokeWidth: 2 },
          new go.Binding("stroke", "isSelected", function(sel) { return sel ? "dodgerblue" : "gray"; }).ofObject()),
        $(go.Shape,  // the arrowhead
          { toArrow: "standard", strokeWidth: 0, fill: "gray" }),
        $(go.Panel, "Auto",  // the link label, normally not visible
          { visible: false, name: "LABEL", segmentIndex: 2, segmentFraction: 0.5 },
          new go.Binding("visible", "visible").makeTwoWay(),
          $(go.Shape, "RoundedRectangle",  // the label shape
            { fill: "#F8F8F8", strokeWidth: 0 }),
          $(go.TextBlock, "Yes",  // the label
            {
              textAlign: "center",
              font: "10pt helvetica, arial, sans-serif",
              stroke: "#333333",
              editable: true
            },
            new go.Binding("text").makeTwoWay())
        )
      );

      dia.nodeTemplateMap.add("Comment",
      $(go.Node, "Auto", nodeStyle(),
        $(go.Shape, "rectangle",
          { fill: "#282c34", stroke: "#DEE0A3", strokeWidth: 3 }),
        $(go.TextBlock, textStyle(),
          {
            margin: 8,
            maxSize: new go.Size(200, NaN),
            wrap: go.TextBlock.WrapFit,
            textAlign: "center",
            editable: true
          },
          new go.Binding("text").makeTwoWay())
        // no ports, because no links are allowed to connect with a comment
      ));

    // Make link labels visible if coming out of a "conditional" node.
    // This listener is called by the "LinkDrawn" and "LinkRelinked" DiagramEvents.
   

    dia.toolManager.linkingTool.temporaryLink.routing = go.Link.Orthogonal;
    dia.toolManager.relinkingTool.temporaryLink.routing = go.Link.Orthogonal;

    
    console.log(dia.model.toJson()); 
          
    
  return dia;
  }  
  public diagramNodeData: Array<go.ObjectData> = [
    { key:'Start', category: "Start", text: "Start" },
    { key:'Step',text: "Step" },
    { key:'Conditional',category: "Conditional", text: "???" },
    { key:'End',category: "End", text: "End" },
    { key:'Comment',category: "Comment", text: "Comment" }
  ];
  public diagramLinkData: Array<go.ObjectData> = [
  ];


  public diagramDivClassName: string = 'myDiagramDiv';
  public diagramModelData = { prop: 'value' };
  public skipsDiagramUpdate = false;

  // When the diagram model changes, update app data to reflect those changes
  public diagramModelChange = function(changes: go.IncrementalData) {
    // when setting state here, be sure to set skipsDiagramUpdate: true since GoJS already has this update
    // (since this is a GoJS model changed listener event function)
    // this way, we don't log an unneeded transaction in the Diagram's undoManager history
    this.skipsDiagramUpdate = true;

    this.diagramNodeData = DataSyncService.syncNodeData(changes, this.diagramNodeData);
    this.diagramLinkData = DataSyncService.syncLinkData(changes, this.diagramLinkData);
    this.diagramModelData = DataSyncService.syncModelData(changes, this.diagramModelData);
  };



  public initPalette(): go.Palette {
    const $ = go.GraphObject.make;
    
    const palette = $(go.Palette);  // must name or refer to the DIV HTML element
    const textStyle =function () {
      return {
        font: "bold 11pt Lato, Helvetica, Arial, sans-serif",
        stroke: "#F8F8F8"
      }
    }

    const nodeStyle=function () {
      return [
        // The Node.location comes from the "loc" property of the node data,
        // converted by the Point.parse static method.
        // If the Node.location is changed, it updates the "loc" property of the node data,
        // converting back using the Point.stringify static method.
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        {
          // the Node.location is at the center of each node
          locationSpot: go.Spot.Center
        }
      ];
    }
    
    palette.nodeTemplate= $(go.Node, 'Spot',
        
    $(go.Panel, "Auto",
      $(go.Shape, "Rectangle",
        { fill: "#282c34", stroke: "#00A9C9", strokeWidth: 3.5 },
        new go.Binding("figure", "figure")),
      $(go.TextBlock, textStyle(),
        {
          margin: 8,
          maxSize: new go.Size(160, NaN),
          wrap: go.TextBlock.WrapFit,
          editable: true
        },
        new go.Binding("text").makeTwoWay())
    ));

    palette.nodeTemplateMap.add("Conditional",
    $(go.Node, "Table", nodeStyle(),
      // the main object is a Panel that surrounds a TextBlock with a rectangular Shape
      $(go.Panel, "Auto",
        $(go.Shape, "Diamond",
          { fill: "#282c34", stroke: "#00A9C9", strokeWidth: 3.5 },
          new go.Binding("figure", "figure")),
        $(go.TextBlock, textStyle(),
          {
            margin: 8,
            maxSize: new go.Size(160, NaN),
            wrap: go.TextBlock.WrapFit,
            editable: true
          },
          new go.Binding("text").makeTwoWay())
      )
      
    ));

    palette.nodeTemplateMap.add("Start",
    $(go.Node, "Table", nodeStyle(),
      $(go.Panel, "Spot",
        $(go.Shape, "Circle",
          { desiredSize: new go.Size(70, 70), fill: "#282c34", stroke: "#09d3ac", strokeWidth: 3.5 }),
        $(go.TextBlock, "Start", textStyle(),
          new go.Binding("text"))
      )
    ));

    palette.nodeTemplateMap.add("End",
    $(go.Node, "Table", nodeStyle(),
      $(go.Panel, "Spot",
        $(go.Shape, "Circle",
          { desiredSize: new go.Size(60, 60), fill: "#282c34", stroke: "#DC3C00", strokeWidth: 3.5 }),
        $(go.TextBlock, "End", textStyle(),
          new go.Binding("text"))
      )
    ));

    palette.nodeTemplateMap.add("Comment",
      $(go.Node, "Auto", nodeStyle(),
        $(go.Shape, "rectangle",
          { fill: "#282c34", stroke: "#DEE0A3", strokeWidth: 3 }),
        $(go.TextBlock, textStyle(),
          {
            margin: 8,
            maxSize: new go.Size(200, NaN),
            wrap: go.TextBlock.WrapFit,
            textAlign: "center",
            editable: true
          },
          new go.Binding("text").makeTwoWay())
        // no ports, because no links are allowed to connect with a comment
      ));

    
    palette.model = $(go.GraphLinksModel,
      {
        linkKeyProperty: 'key',  // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
      });

    
    return palette;
  }
  
  public paletteNodeData: Array<go.ObjectData> = [
    { category: "Start", text: "Start" },
    { text: "Step" },
    { category: "Conditional", text: "???" },
    { category: "End", text: "End" },
    { category: "Comment", text: "Comment" }
  ];
  public paletteLinkData: Array<go.ObjectData> = [
    {  }
  ];
  public paletteModelData = { prop: 'val' };
  public paletteDivClassName = 'myPaletteDiv';
  public skipsPaletteUpdate = false;
  public paletteModelChange = function(changes: go.IncrementalData) {
    // when setting state here, be sure to set skipsPaletteUpdate: true since GoJS already has this update
    // (since this is a GoJS model changed listener event function)
    // this way, we don't log an unneeded transaction in the Palette's undoManager history
    this.skipsPaletteUpdate = true;

    this.paletteNodeData = DataSyncService.syncNodeData(changes, this.paletteNodeData);
    this.paletteLinkData = DataSyncService.syncLinkData(changes, this.paletteLinkData);
    this.paletteModelData = DataSyncService.syncModelData(changes, this.paletteModelData);
  };

  constructor(private cdr: ChangeDetectorRef) { }

  // Overview Component testing
  public oDivClassName = 'myOverviewDiv';
  public initOverview(): go.Overview {
    const $ = go.GraphObject.make;
    const overview = $(go.Overview);
    return overview;
  }
  public observedDiagram = null;

  // currently selected node; for inspector
  public selectedNode: go.Node | null = null;

  public ngAfterViewInit() {

    if (this.observedDiagram) return;
    this.observedDiagram = this.myDiagramComponent.diagram;
    this.cdr.detectChanges(); // IMPORTANT: without this, Angular will throw ExpressionChangedAfterItHasBeenCheckedError (dev mode only)

    const appComp: AppComponent = this;
    // listener for inspector
    this.myDiagramComponent.diagram.addDiagramListener('ChangedSelection', function(e) {
      if (e.diagram.selection.count === 0) {
        appComp.selectedNode = null;
      }
      const node = e.diagram.selection.first();
      if (node instanceof go.Node) {
        appComp.selectedNode = node;
      } else {
        appComp.selectedNode = null;
      }
    });

  } // end ngAfterViewInit


  public handleInspectorChange(newNodeData) {
    const key = newNodeData.key;
    // find the entry in nodeDataArray with this key, replace it with newNodeData
    let index = null;
    for (let i = 0; i < this.diagramNodeData.length; i++) {
      const entry = this.diagramNodeData[i];
      if (entry.key && entry.key === key) {
        index = i;
      }
    }

    if (index >= 0) {
      // here, we set skipsDiagramUpdate to false, since GoJS does not yet have this update
      this.skipsDiagramUpdate = false;
      this.diagramNodeData[index] = _.cloneDeep(newNodeData);
      // this.diagramNodeData[index] = _.cloneDeep(newNodeData);
    }

    // var nd = this.observedDiagram.model.findNodeDataForKey(newNodeData.key);
    // console.log(nd);

  }


}