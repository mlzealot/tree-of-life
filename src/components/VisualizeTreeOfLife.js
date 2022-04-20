import React from 'react';
import * as d3 from 'd3';
import data from '../data/KidneyRegular.csv';

function linkStep(startAngle, startRadius, endAngle, endRadius) {
    const c0 = Math.cos(startAngle = (startAngle - 90) / 180 * Math.PI);
    const s0 = Math.sin(startAngle);
    const c1 = Math.cos(endAngle = (endAngle - 90) / 180 * Math.PI);
    const s1 = Math.sin(endAngle);
    return "M" + startRadius * c0 + "," + startRadius * s0
        + (endAngle === startAngle ? "" : "A" + startRadius + "," + startRadius + " 0 0 " + (endAngle > startAngle ? 1 : 0) + " " + startRadius * c1 + "," + startRadius * s1)
        + "L" + endRadius * c1 + "," + endRadius * s1;
}


function linkConstant(d) {
    return linkStep(d.source.x, d.source.y, d.target.x, d.target.y);
}


function mouseovered(active) {
    return function(event, d) {
      d3.select(this).classed("label--active", active);
      d3.select(d.linkExtensionNode).classed("link-extension--active", active).raise();
      do d3.select(d.linkNode).classed("link--active", active).raise();
      while (d = d.parent);
    };
}


export default function TreeOfLife() {
    const handleFileUpload = e => {
        const [file] = e.target.files;
        console.log(file);
        if (file) {
            const reader = new FileReader();
            reader.addEventListener("loadend", function() {
                // https://stackoverflow.com/questions/42285441/how-to-read-in-csv-with-d3-v4
                let data = d3.csvParse(reader.result);
                let colorMap = getCategories(data);
                let coloredData = assignColorToRows(data, colorMap);
                let structuredData = createHierarchyFromData(coloredData);
                // visualizeTreeData(structuredData);
                legend(colorMap);
                visualizeCurvedTree(structuredData, colorMap);
                
            });
            reader.readAsText(file);
        }
    };


    const getRandomColor = () => {
        const colors = ["#D32F2F", "#D81B60", "#AB47BC", "#4A148C", "#D50000", 
                        "#C51162", "#AA00FF", "#7E57C2", "#512DA8", "#311B92", 
                        "#6200EA", "#5C6BC0", "#303F9F", "#1A237E", "#304FFE", 
                        "#0D47A1", "#2962FF", "#0277BD", "#006064", "#00796B", 
                        "#004D40", "#1B5E20", "#33691E", "#FF6F00", "#2D313A", 
                        "#BF360C", "#DD2C00", "#795548", "#4E342E", "#757575"];
        const randIndex = Math.floor(Math.random() * colors.length);
        return colors[randIndex];
    }


    const getCategories = (jsonArray) => {
        let categories = new Set();
        for (let i=0; i<jsonArray.length; i++){
            categories.add(jsonArray[i]["AS/2/LABEL"]);
        }
        let catToColorMap = {}
        categories = Array.from(categories);
        for (let i=0; i<categories.length; i++){
            catToColorMap[categories[i]] = getRandomColor();
        }
        return catToColorMap;
    }

    const assignColorToRows = (data, colorMap) => {
        for (let i=0; i<data.length; i++) {
            let category = data[i]["AS/2/LABEL"];
            data[i]["color"] = colorMap[category];
        }
        return data;
    }

    const createHierarchyFromData = (tidyColoredData) => {
        let columnNames = Array.from(Object.keys(tidyColoredData[0]));
        const idRegExp = new RegExp("AS\/[0-9]*\/ID");
        const ctIdRegExp = new RegExp("CT\/1\/ID");
        let hierarchicalColumns = columnNames
                .filter(colName => idRegExp.test(colName) || ctIdRegExp.test(colName));
        console.log(hierarchicalColumns);
        let dataMapping = []
        for (let i=0; i<tidyColoredData.length; i++) {
            let row = tidyColoredData[i];
            let parentId = "";
            let parentName = "";
            let mapping = {};
            for (let j=0; j<hierarchicalColumns.length; j++){
                let colName = hierarchicalColumns[j];
                let idArray = colName.split("/");
                let labelColName = idArray[0] + "/" + idArray[1] + "/" + "LABEL";
                if(row[colName] !== "" && parentId !== row[colName]){
                    mapping = {
                        "childId" : row[colName],
                        "parentId": parentId,
                        "childLabel": row[labelColName],
                        "parentLabel": parentName,
                        "color": row["color"]
                    }
                    parentId = row[colName];
                    parentName = row[labelColName];
                    dataMapping.push(mapping);
                }
            }
        }
        var cleanMapping = dataMapping.filter((arr, index, self) =>
            index === self.findIndex((t) => (t.childId === arr.childId && t.parentId === arr.parentId)))
        return cleanMapping;
    }

    const visualizeTreeData = (structuredData, colorMap) => {
        let root = d3.stratify()
                .id(function(row){return row.childId;})
                .parentId(function(row){return row.parentId;})
                (structuredData)
                .sort((a, b) => (a.value - b.value) || d3.ascending(a.data.length, b.data.length));
        
        let height = 1200;
        let width = 1200;
        let outerRadius = width / 2;
        let innerRadius = outerRadius * 0.5;
    
        let svg = d3.select('#treeOfLife')
            .append('svg')
            .attr("viewBox", [-outerRadius, -outerRadius, width, height])
            .attr("font-family", "sans-serif")
            .attr("font-size", 10);
        
        svg.append("style").text(`
            .link--active {
                stroke: #000 !important;
                stroke-width: 1.5px;
            }
            
            .link-extension--active {
                stroke-opacity: .6;
            }
            
            .label--active {
                font-weight: bold;
            }
        `);

        let tree = d3.cluster()
            .size([360, innerRadius])
            .separation((a, b) => 1)

        let treeData = tree(root);
    
        let allNodes = treeData.descendants();
        let leafNodes = treeData.leaves();
        let links = treeData.links();

        const link = svg.append("g")
            .attr("fill", "none")
            .attr("stroke", "#000")
            .selectAll("path")
            .data(links)
            .join("path")
            .each(function(d) { d.target.linkNode = this;})
            .attr("d", linkConstant)
            
        
        svg.append("g")
            .selectAll("text")
            .data(leafNodes)
            .join("text")
            .attr("dy", ".31em")
            .attr("transform", d => `rotate(${d.x - 90}) translate(${innerRadius + 4},0)${d.x < 180 ? "" : " rotate(180)"}`)
            .attr("text-anchor", d => d.x < 180 ? "start" : "end")
            .text(d => d.data.childLabel)
            .on("mouseover", mouseovered(true))
            .on("mouseout", mouseovered(false));

        
    }
    const legend = (colorMap) => {
        let legendSvg = d3.select("#legend").append("svg").attr("width", 200).attr("height",400);
        const keys = Object.keys(colorMap);
        const colorValues = Object.values(colorMap)
        let color = d3.scaleOrdinal()
            .domain(keys)
            .range(colorValues);
        console.log(color);

        legendSvg.selectAll("legendDots")
            .data(keys)
            .enter()
            .append("circle")
            .attr("cx", 10)
            .attr("cy", function(d,i){ return 100 + i*20}) // 100 is where the first dot appears. 25 is the distance between dots
            .attr("r", 6)
            .style("fill", function(d){ return color(d)})

        // Add one dot in the legend for each name.
        legendSvg.selectAll("legendLabels")
            .data(keys)
            .enter()
            .append("text")
            .attr("x", 30)
            .attr("y", function(d,i){ return 100 + i*20}) // 100 is where the first dot appears. 25 is the distance between dots
            .style("fill", function(d){ return color(d)})
            .text(function(d){ return d})
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")
    }

    const visualizeCurvedTree = (structuredData, colorMap) => {
        let root = d3.stratify()
                .id(function(row){return row.childId;})
                .parentId(function(row){return row.parentId;})
                (structuredData);
        
        console.log(root);
        let height = 1200;
        let width = 1200;
    
        let svg = d3.select('#treeOfCurves')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
        
        svg.append("style").text(`
            .link--active {
                stroke: #000 !important;
                stroke-width: 1.5px;
            }

            .label--active {
                font-weight: bold;
            }
        `);
    
        let diameter = height * 0.50;
        let radius = diameter / 2;
        // let outerRadius = width / 4;
        // let innerRadius = outerRadius * 0.4
    
        let tree = d3.cluster()
            .size([2*Math.PI, radius])
            .separation(function(a, b) { return (a.parent === b.parent ? 1 : 2) / a.depth; });
    
        let treeData = tree(root);
        
        // let allNodes = treeData.descendants();
        let leafNodes = treeData.leaves();
        let links = treeData.links();
        
        let graphGroup = svg.append('g')
            .attr("fill", "none")
            .attr("stroke", "#22252c")
            .attr("stroke-opacity", 0.6)
            .attr('transform', "translate("+(width/2)+","+(height/2)+")");
    
        graphGroup.selectAll(".link")
            .data(links)
            .join("path")
            .attr("class", "link")
            .attr("d", d3.linkRadial()
            .angle(d => d.x)
            .radius(d => d.y));
        
        let leafNodesText = graphGroup
            .selectAll(".node")
            .data(leafNodes)
            .join("g")
            .attr("class", "node")
            .attr("transform", function(d){
                return `rotate(${d.x * 180 / Math.PI - 90})` + `translate(${d.y}, 0)`;
            });
    
    
        leafNodesText.append("circle").attr("r", 1);
    
        leafNodesText.append("text")
            .attr("font-family", "sans-serif")
            .attr("font-size", 11)
            .attr("dx", function(d) { return d.x < Math.PI ? 8 : -8; })
            .attr("dy", ".31em")
            .attr("text-anchor", function(d) { return d.x < Math.PI ? "start" : "end"; })
            .attr("transform", function(d) { return d.x < Math.PI ? null : "rotate(180)"; })
            .text(function(d) { return d.data.childLabel; })
            .attr("stroke", d => d.data.color)
            .on("mouseover", mouseovered(true))
            .on("mouseout", mouseovered(false));
    }

    const handleClick = async() => {
        let dataArray = []
        await d3.csv(data, function(row) {
            dataArray.push(row);
        });
        let colorMap = getCategories(dataArray);
        let coloredData = assignColorToRows(dataArray, colorMap);
        let structuredData = createHierarchyFromData(coloredData);
        visualizeCurvedTree(structuredData, colorMap);
        legend(colorMap);
        return dataArray;
    }

    

    return (
        <div>
            <h1>Welcome to the tree of life explorer.</h1>
            <h4>Upload a regular CSV file with a flat hierarchy.</h4>
            <h4>To upload a csv in CNS v1.1 format, please run preprocessing.py before uploading it.</h4>
            <input type="file" multiple={false} onChange={handleFileUpload}/>
            <button onClick={handleClick}>
                Visualize Kidney Data
            </button>
            <div id="treeOfLife"></div>
            <div id="treeOfCurves">
            </div>
            <div id="legend"></div>
        </div>
    );
}