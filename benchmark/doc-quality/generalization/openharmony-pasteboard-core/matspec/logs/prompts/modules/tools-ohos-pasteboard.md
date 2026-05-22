You are the MatSpec module documentation runner.
Task: generate an intermediate module design document for later design.md synthesis.

硬性输出规则：
1. 只输出最终 Markdown 正文，不要添加解释、前言或后记。
2. 不要用 ```md 或其他代码围栏包裹整篇文档。
3. 不要提及 sandbox、filesystem、read-only mode、无法写文件或“复制到仓库”等运行环境说明。
4. 默认使用中文输出。
5. 不要声称文件已经写入；MatSpec CLI 会保存产物。

Module document requirements:
1. Module docs are white-box intermediate material and may include files, classes, frameworks, and tables.
2. Explain module purpose, directory structure, core components, core flows, interfaces/data structures, and key constraints.
3. Base the content on the given module path and read-only repository analysis. Do not invent files.

Module: Ohos Pasteboard
Path: tools/ohos-pasteboard
Description: Component source module discovered under tools/.

Module files:
- tools/ohos-pasteboard/docs/README.md
- tools/ohos-pasteboard/docs/TEST.md
- tools/ohos-pasteboard/include/clear_data_command.h
- tools/ohos-pasteboard/include/command.h
- tools/ohos-pasteboard/include/error_handler.h
- tools/ohos-pasteboard/include/executor.h
- tools/ohos-pasteboard/include/get_data_command.h
- tools/ohos-pasteboard/include/has_data_command.h
- tools/ohos-pasteboard/include/has_data_type_command.h
- tools/ohos-pasteboard/include/has_remote_data_command.h
- tools/ohos-pasteboard/include/parser.h
- tools/ohos-pasteboard/include/printer.h
- tools/ohos-pasteboard/include/set_data_command.h
- tools/ohos-pasteboard/ohos-pasteboard.json
- tools/ohos-pasteboard/src/clear_data_command.cpp
- tools/ohos-pasteboard/src/error_handler.cpp
- tools/ohos-pasteboard/src/executor.cpp
- tools/ohos-pasteboard/src/get_data_command.cpp
- tools/ohos-pasteboard/src/has_data_command.cpp
- tools/ohos-pasteboard/src/has_data_type_command.cpp
- tools/ohos-pasteboard/src/has_remote_data_command.cpp
- tools/ohos-pasteboard/src/main.cpp
- tools/ohos-pasteboard/src/parser.cpp
- tools/ohos-pasteboard/src/printer.cpp
- tools/ohos-pasteboard/src/set_data_command.cpp
- tools/ohos-pasteboard/tests/error_handler_test.cpp
- tools/ohos-pasteboard/tests/executor_test.cpp
- tools/ohos-pasteboard/tests/integration_test.cpp
- tools/ohos-pasteboard/tests/parser_test.cpp
- tools/ohos-pasteboard/tests/printer_test.cpp

Module tree:
tools/
  ohos-pasteboard/
    docs/
      README.md
      TEST.md
    include/
      clear_data_command.h
      command.h
      error_handler.h
      executor.h
      get_data_command.h
      has_data_command.h
      has_data_type_command.h
      has_remote_data_command.h
      parser.h
      printer.h
      set_data_command.h
    ohos-pasteboard.json
    src/
      clear_data_command.cpp
      error_handler.cpp
      executor.cpp
      get_data_command.cpp
      has_data_command.cpp
      has_data_type_command.cpp
      has_remote_data_command.cpp
      main.cpp
      parser.cpp
      printer.cpp
      set_data_command.cpp
    tests/
      error_handler_test.cpp
      executor_test.cpp
      integration_test.cpp
      parser_test.cpp
      printer_test.cpp

Repository evidence:
Directory Source File Stats:
services/dfx/src/                        (21 files, 1860 lines)
framework/innerkits/include/             (20 files, 1853 lines)
framework/innerkits/src/                 (19 files, 6595 lines)
services/core/include/                   (15 files, 1156 lines)
interfaces/kits/napi/include/            (12 files, 1132 lines)
services/zidl/src/                       (12 files, 808 lines)
services/zidl/include/                   (12 files, 455 lines)
framework/tlv/                           (11 files, 1742 lines)
tools/ohos-pasteboard/src/               (11 files, 1103 lines)
tools/ohos-pasteboard/include/           (11 files, 408 lines)
interfaces/kits/napi/src/                (10 files, 5535 lines)
services/core/src/                       (7 files, 5845 lines)
utils/native/include/                    (7 files, 679 lines)
interfaces/cj/src/                       (5 files, 1556 lines)
interfaces/cj/include/                   (5 files, 320 lines)
interfaces/taihe/src/                    (4 files, 2160 lines)
framework/framework/device/              (4 files, 856 lines)
interfaces/ndk/include/                  (4 files, 720 lines)
framework/framework/include/common/      (4 files, 376 lines)
framework/framework/include/device/      (4 files, 272 lines)
framework/framework/clip/                (3 files, 288 lines)
framework/framework/eventcenter/         (3 files, 196 lines)
framework/framework/include/eventcenter/ (3 files, 149 lines)
services/dfx/src/statistic/              (3 files, 90 lines)
services/dfx/src/fault/                  (3 files, 87 lines)
services/dfx/src/behaviour/              (3 files, 86 lines)
interfaces/ndk/src/                      (2 files, 535 lines)
adapter/src/                             (2 files, 514 lines)
interfaces/ani/include/                  (2 files, 317 lines)
adapter/data_share/                      (2 files, 204 lines)
interfaces/taihe/include/                (2 files, 189 lines)
utils/native/src/                        (2 files, 162 lines)
services/switch/                         (2 files, 157 lines)
services/load/src/                       (2 files, 141 lines)
adapter/include/                         (2 files, 117 lines)
adapter/security_level/                  (2 files, 106 lines)
adapter/pasteboard_progress/             (2 files, 100 lines)
services/dialog/PasteboardDialog/entry/src/main/ets/ServiceExtAbility/ (2 files, 89 lines)
services/load/include/                   (2 files, 77 lines)
interfaces/ndk/unittest/                 (1 files, 2429 lines)
interfaces/ani/src/                      (1 files, 1150 lines)
framework/framework/serializable/        (1 files, 213 lines)
framework/framework/ffrt/                (1 files, 170 lines)
framework/framework/include/ffrt/        (1 files, 153 lines)
framework/framework/include/serializable/ (1 files, 135 lines)
framework/framework/include/clip/        (1 files, 95 lines)
framework/framework/common/              (1 files, 36 lines)
framework/framework/include/permission/  (1 files, 35 lines)
services/dialog/PasteboardDialog/entry/src/main/ets/PasteboardProgressAbility/ (1 files, 34 lines)
framework/framework/permission/          (1 files, 32 lines)
services/account/include/                (1 files, 30 lines)
services/account/src/                    (1 files, 27 lines)
services/dialog/PasteboardDialog/entry/src/main/ets/Application/ (1 files, 23 lines)
framework/framework/include/api/         (1 files, 22 lines)
services/dialog/PasteboardDialog/hvigor/ (1 files, 15 lines)
services/dialog/PasteboardDialog/        (1 files, 2 lines)
services/dialog/PasteboardDialog/entry/  (1 files, 2 lines)

Core Directory Coverage:
- none

README context:
--- README.md ---
# pasteBoardService

## Introduction

​     As a functional component of the stray subsystem, the clipboard service provides the ability to manage the system clipboard and supports the system copy and paste functions. The system clipboard supports package text, hypertext, URIs and other content operations.

**picture 1**  Subsystem Architecture Diagram
![](figures/subsystem_architecture.png "Subsystem architecture")

​		The clipboard service provides functions that support application developers to use clipboard-related services conveniently and efficiently. Its main components include clipboard management client and clipboard service. The clipboard management client is responsible for clipboard interface management, providing clipboard northbound JS API to applications; creating clipboard data on the application framework side, requesting clipboard SA to perform clipboard creation, deletion, query, text conversion, configuration, etc. The clipboard service is responsible for clipboard event management, manages the life cycle of clipboard SA (startup, destruction, multi-user, etc.); executes application requests, notifies clipboard data management, and returns the results to the clipboard management client.



## Directory Structure

```
/foundation/distributeddatamgr/pasteboard
├── etc         # Configuration files for the processes contained in the component
├── figures     # Framework diagram
├── framework   # innerKit interface
├── interfaces  # The interface code provided by the component externally
│   └── kits    # Interface provided to the application
├── profile     # Configuration files for system services contained in the component
├── services    # clipboard service implementation
│    └── core   # Core code implementation
│    └── test   # native test code
│    └── zidl   # Cross-process communication code implementation
├── utils       # Tests or services use mocked data
└──README.md    # Instructions for use
```

## illustrate

### Interface Description

**list 1**   PasteBoard open main method

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>interface name</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>describe</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createHtmlData(htmlText: string): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteData object of type MIMETYPE_TEXT_HTML for HTML type data</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>createWantData(want: Want): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>Create a PasteData object of type MIMETYPE_TEXT_WANT for data of type want</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createPlainTextData(text: string): PasteData</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteData object of type MIMETYPE_TEXT_PLAIN for plain text data</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createUriData(uri: string): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteData object of type MIMETYPE_TEXT_URI for data of type URI</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createHtmlTextRecord(htmlText: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteDataRecord object of type RecordMIMETYPE_TEXT_HTML for hypertext type data</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createWantRecord(want: Want): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteDataRecord object of type MIMETYPE_TEXT_WANT for data of type want</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createPlainTextRecord(text: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteDataRecord object of type MIMETYPE_TEXT_PLAIN for plain text data</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createUriRecord(uri: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Create a PasteDataRecord object of type MIMETYPE_TEXT_URI for data of type URI</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getSystemPasteboard(): SystemPasteboard</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Get system clipboard</p>
</td>
</tr>
</tbody>
</table>



**list 2**  SystemPasteboard open main method

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>interface name</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>describe</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>on(type:'update', callback: () => void): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Callback called when the open pasteboard content changes</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>off(type: 'update', callback?: () => void): void</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>Callback called when the content of the pasteboard is closed</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>clear(callback: AsyncCallback<void>): void</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>clear clipboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>clear(): Promise<void>;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>clear clipboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPasteData(callback: AsyncCallback&lt;PasteData&gt;): void</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Get system clipboard data object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPasteData():Promise&lt;PasteData&gt;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Get system clipboard data object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasPasteData(callback: AsyncCallback&lt;boolean&gt:void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Check if there is content in the pasteboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasPasteData(): Promise&lt;boolean&gt;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Check if there is content in the pasteboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>setPasteData(data: PasteData, callback: AsyncCallback&lt;void&gt:void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Write PasteData to the pasteboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>setPasteData(data: PasteData): Promise&lt;void&gt;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Write PasteData to the pasteboard</p>
</td>
</tr>
</tbody>
</table>



**list 3**  PasteData open main method

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>interface name</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>describe</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addHtmlRecord(htmlText: string): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Add the HTML text record to the PasteData object and update the MIME type to PasteData#MIMETYPE_TEXT_HTML in the DataProperty.</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>addWantRecord(want: Want): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>Add want record to PasteData object and update MIME type to PasteData#MIMETYPE_TEXT_WANT in DataProperty</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addRecord(record: PasteDataRecord): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Add PasteRecord to paste data object and update MIME type in data attribute</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addTextRecord(text: string): void;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Add plain text records to PasteData object and update MIME type to PasteData#MIMETYPE_TEXT_PLAIN in DataProperty</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addUriRecord(uri: string): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Add URI record to PasteData object and update MIME type to PasteData#MIMETYPE_TEXT_URI in DataProperty</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getMimeTypes(): Array&lt;string&gt;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>MIME type of everything on the pasteboard</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryHtml(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>HTML text of the main record in the PasteData object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryWant(): Want;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>The want of the main record in the PasteData object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryMimeType(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>The MIME type of the main record in the PasteData object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryUri(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>URI of the main record in the PasteData object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getProperty(): PasteDataProperty;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Get the properties of the clipboard data object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getRecordAt(index: number): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>records based on the specified index</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getRecordCount(): number;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Number of records in PasteData object</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasMimeType(mimeType: string): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Checks if data of the specified MIME type exists in the DataProperty</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>removeRecordAt(index: number): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Delete records based on specified index</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>replaceRecordAt(index: number, record: PasteDataRecord): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Replace the specified record with a new record</p>
</td>
</tr>
</tbody>
</table>





**list 4**  PasteDataRecord open main method

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>interface name</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>describe</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>convertToText(callback: AsyncCallback&lt;string&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Convert PasteData to text content</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>convertToText():  Promise&lt;void&gt;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>Convert PasteData to text content</p>
</td>
</tr>
</tbody>
</table>



**list 5**  PasteDataProperty Parameter Description

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="30%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>name</p>
</th>
<th class="cellrowborder" valign="top" width="30%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>type</p>
</th>
<th class="cellrowborder" valign="top" width="40%" id="mcps1.2.3.1.3"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>illustrate</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>additions{[key:string]}</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>object</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Additional property data key-value pair</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>mimeTypes</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Array<string></p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Distinct MIME types for all records in PasteData</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>tag</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>string</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>User-defined labels for PasteData objects</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>timestamp</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>number</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Timestamp indicating when the data was written to the system clipboard.</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>localOnly</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a> boolean</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Check if PasteData is set for local access only.</p>
</td>
</tr>
</tbody>
</table>


### Instructions for use

Clipboard module usage example：

```
// import module
import pasteboard from '@ohos.pasteboard'
//text copy
console.log('Get SystemPasteboard')
var systemPasteboard = pasteboard.getSystemPasteboard()
systemPasteboard.clear()
        
var textData = 'Hello World!'
console.log('createPlainTextData = ' + textData)
var pasteData = pasteboard.createPlainTextData(textData)
        
console.log('Writes PasteData to the pasteboard')
systemPasteboard.setPasteData(pasteData)
        
console.log('Checks there is content in the pasteboard')
assert.equal(systemPasteboard.hasPasteData(), true)
        
console.log('Checks the number of records')
pasteData = systemPasteboard.getPasteData()
assert.equal(pasteData.getRecordCount(), 1)
        
console.log('Checks the pasteboard content')
assert.equal(pasteData.getPrimaryText(), textData)
        
console.log('Checks there is a MIMETYPE_TEXT_PLAIN MIME type of data')
assert.equal(pasteData.hasMimeType(MIMETYPE_TEXT_PLAIN), true)
assert.equal(pasteData.getPrimaryMimeType(), MIMETYPE_TEXT_PLAIN)

//clipboard change listener
console.log('Off the content changes')
var systemPasteboard = pasteboard.getSystemPasteboard()
systemPasteboard.off(contentChanges)
systemPasteboard.clear()
        
var textData = 'Hello World!'
console.log('createUriData = ' + textData)
var pasteData = pasteboard.createUriData(textData)
        
console.log('Writes PasteData to the pasteboard')
systemPasteboard.setPasteData(pasteData)
        
console.log('Checks there is content in the pasteboard')
assert.equal(systemPasteboard.hasPasteData(), true)
        
console.log('Checks the number of records')
pasteData = systemPasteboard.getPasteData()
assert.equal(pasteData.getRecordCount(), 1)
        
console.log('On the content changes')
systemPasteboard.on(contentChanges)
        
console.log('Removes the Record')
assert.equal(pasteData.removeRecordAt(0), true)
        
console.log('Writes PasteData to the pasteboard')
systemPasteboard.setPasteData(pasteData)
        
console.log('Checks the number of records')
pasteData = systemPasteboard.getPasteData()
assert.equal(pasteData.getRecordCount(), 0)
        
console.log('Checks there is  no content in the pasteboard')
assert.equal(systemPasteboard.hasPasteData(), false)
        
var textDataNew = 'Hello World!-New'
console.log('createUriData = ' + textDataNew)
var pasteData = pasteboard.createUriData(textDataNew)
        
console.log('Writes PasteData to the pasteboard')
systemPasteboard.setPasteData(pasteData)
        
console.log('Checks there is content in the pasteboard')
assert.equal(systemPasteboard.hasPasteData(), true)
        
console.log('Checks the number of records')
pasteData = systemPasteboard.getPasteData()
assert.equal(pasteData.getRecordCount(), 1)
        
console.log('Checks the pasteboard content')
assert.equal(pasteData.getRecordAt(0).plainText, textDataNew)

```



## Related warehouse

**Distributed Data Management subsystem**

[distributeddatamgr\_pasteboard](https://gitee.com/openharmony/distributeddatamgr_pasteboard)



--- README_ZH.md (truncated) ---
# 剪贴板服务

## 简介

剪贴板服务作为杂散子系统的功能组件，提供管理系统剪贴板的能力，为系统复制、粘贴功能提供支持。系统剪切板支持包文本、超本文、URIs等内容操作。

**图 1**  子系统架构图
![](figures/subsystem_architecture_zh.png "子系统架构图")

剪贴板服务，提供支撑应用开发者方便、高效的使用剪贴板相关业务的功能。其主要组件包括剪贴板管理客户端和剪贴板服务。剪贴板管理客户端负责剪贴板接口管理，提供剪贴板北向JS API给应用；在应用框架侧创建剪贴板数据、请求剪贴板SA执行剪贴板的新建、删除、查询、转换文本、配置等。剪贴板服务负责剪贴板事件管理，管理剪贴板SA的生命周期（启动、销毁、多用户等）；执行应用请求，通知剪贴板数据管理，并将结果返回给剪贴板管理客户端。



## 目录

```
/foundation/distributeddatamgr/pasteboard
├── etc                      # 组件包含的进程的配置文件
├── figures                  # 构架图
├── framework                # innerKit接口
├── interfaces               # 组件对外提供的接口代码
│   └── kits                 # 对应用提供的接口
├── profile                  # 组件包含的系统服务的配置文件
├── services                 # 剪贴板服务实现
│    └── core                # 核心代码实现
│    └── test                # native测试代码
│    └── zidl                # 跨进程通信代码实现
├── utils                    # 测试或服务使用mock的数据
└──README_zh.md              # 使用说明
```

## 说明

### 接口说明

**表 1**   PasteBoard开放的主要方法

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>接口名</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>描述</p>
</th>
</tr>
</thead>
<tbody>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>createData(mimeType: string, value: ValueType): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>用MIME类型和值创建一个PasteData 对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>createRecord(mimeType: string, value: ValueType): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>用MIME类型和值创建一个PasteDataRecord对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>createHtmlData(htmlText: string): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为HTML类型的数据创建一个MIMETYPE_TEXT_HTML类型的PasteData 对象</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>createWantData(want: Want): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>为want类型的数据创建一个MIMETYPE_TEXT_WANT类型的PasteData对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createPlainTextData(text: string): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为纯文本类型的数据创建一个MIMETYPE_TEXT_PLAIN类型的PasteData 对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createUriData(uri: string): PasteData;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为URI类型的数据创建一个MIMETYPE_TEXT_URI类型的PasteData 对象</p></td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createHtmlTextRecord(htmlText: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为超文本类型的数据创建一个RecordMIMETYPE_TEXT_HTML类型的PasteDataRecord对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createWantRecord(want: Want): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为want类型的数据创建一个MIMETYPE_TEXT_WANT类型的PasteDataRecord对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createPlainTextRecord(text: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为纯文本类型的数据创建一个MIMETYPE_TEXT_PLAIN类型的PasteDataRecord对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>createUriRecord(uri: string): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>为URI类型的数据创建一个MIMETYPE_TEXT_URI类型的PasteDataRecord对象</p></td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getSystemPasteboard(): SystemPasteboard;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>获取系统剪贴板</p>
</td>
</tr>
</tbody>
</table>


**表 2**  SystemPasteboard开放的主要方法

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>接口名</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>描述</p>
</th>
</tr>
</thead>
<tbody>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>clearData(callback: AsyncCallback&lt;void&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>清除剪贴板</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>clearData(): Promise&lt;void&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>清除剪贴板</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>getData(callback: AsyncCallback&lt;PasteData&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>从系统剪贴板获取pastedata对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>getData(): Promise&lt;PasteData&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>从系统剪贴板获取pastedata对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>hasData(callback: AsyncCallback&lt;boolean&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>判断系统剪贴板中的内容</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>hasData(): Promise&lt;boolean&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>判断系统剪贴板中的内容</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>setData(data: PasteData, callback: AsyncCallback&lt;void&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>向系统剪贴板写入PasteData</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>setData(data: PasteData): Promise&lt;void&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>向系统剪贴板写入PasteData</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>on(type:'update', callback: () => void): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>打开粘贴板内容更改时调用的回调</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>off(type: 'update', callback?: () => void): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>关闭粘贴板内容更改时调用的回调</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>clear(callback: AsyncCallback&lt;void&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>清除剪贴板</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>clear(): Promise&lt;void&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>清除剪贴板</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPasteData(callback: AsyncCallback&lt;PasteData&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>获取系统剪贴板数据对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPasteData():Promise&lt;PasteData&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>获取系统剪贴板数据对象</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasPasteData(callback: AsyncCallback&lt;boolean&gt;:void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>检查粘贴板中是否有内容</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasPasteData(): Promise&lt;boolean&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>检查粘贴板中是否有内容</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>setPasteData(data: PasteData, callback: AsyncCallback&lt;void&gt;:void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将 PasteData 写入粘贴板</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>setPasteData(data: PasteData): Promise&lt;void&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将 PasteData 写入粘贴板</p>
</td>
</tr>
</tbody>
</table>


**表 3**  PasteData开放的主要方法

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>接口名</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>描述</p>
</th>
</tr>
</thead>
<tbody>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>addRecord(mimeType: string, value: ValueType): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>将mimeType和对应值添加到 PasteData 对象中</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>getRecord(index: number): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>使用PasteData对象中的次序获取PasteDataRecord记录</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>hasType(mimeType: string): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>判断DataProperty中是否有指定MIME类型的值</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>removeRecord(index: number): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>基于PasteData中值的次序删除一条记录</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>replaceRecord(index: number, record: PasteDataRecord): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>用PasteDataRecord记录替换PasteData中指定次序的记录</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>addHtmlRecord(htmlText: string): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>将 HTML 文本记录添加到 PasteData 对象，并将 MIME 类型更新为 DataProperty 中的 PasteData#MIMETYPE_TEXT_HTML。</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>addWantRecord(want: Want): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>将want记录添加到 PasteData 对象，并将 MIME 类型更新为 DataProperty 中的 PasteData#MIMETYPE_TEXT_WANT</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addRecord(record: PasteDataRecord): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将 PasteRecord 添加到粘贴数据对象并更新数据属性中的 MIME 类型</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addTextRecord(text: string): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将纯文本记录添加到 PasteData 对象，并将 MIME 类型更新为 DataProperty 中的 PasteData#MIMETYPE_TEXT_PLAIN</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>addUriRecord(uri: string): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将 URI 记录添加到 PasteData 对象，并将 MIME 类型更新为 DataProperty 中的 PasteData#MIMETYPE_TEXT_URI</p></td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getMimeTypes(): Array&lt;string&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>粘贴板上所有内容的 MIME 类型</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryHtml(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中主要记录的 HTML 文本</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryWant(): Want;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中的主记录的want</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryMimeType(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中主记录的 MIME 类型。</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryUri(): string;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中主记录的 URI</p>  </td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getPrimaryPixelMap(): image.PixelMap;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中主记录的 PixelMap。</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getProperty(): PasteDataProperty;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>获取剪贴板数据对象的属性</p>         </td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>setProperty(property: PasteDataProperty): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>设置属性描述对象，当前仅支持设置shareOption属性。</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getRecordAt(index: number): PasteDataRecord;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>基于指定索引的记录</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>getRecordCount(): number;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象中的记录数</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>hasMimeType(mimeType: string): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>检查 DataProperty 中是否存在指定的 MIME 类型的数据</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>removeRecordAt(index: number): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>根据指定索引删除记录</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>replaceRecordAt(index: number, record: PasteDataRecord): boolean;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>用新记录替换指定记录</p>
</td>
</tr>
</tbody>
</table>


**表 4**  PasteDataRecord开放的主要方法

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>接口名</p>
</th>
<th class="cellrowborder" valign="top" width="50%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>描述</p>
</th>
</tr>
</thead>
<tbody>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>convertToTextV9(callback: AsyncCallback&lt;string&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a></a>将 PasteData中的数据 转换为文本格式</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144">convertToTextV9(): Promise&lt;string&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a>将 PasteData中的数据 转换为文本格式</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a>convertToText(callback: AsyncCallback&lt;string&gt;): void;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>将 PasteData 转换为文本内容的内容</p>
</td>
</tr>
<tr id="row13335054111018"><td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.1 "><p id="p12832214151418"><a name="p12832214151418"></a><a name="p12832214151418"></a>convertToText():  Promise&lt;void&gt;;</p>
</td>
<td class="cellrowborder" valign="top" width="50%" headers="mcps1.2.3.1.2 "><p id="p3335145451011"><a name="p3335145451011"></a><a name="p3335145451011"></a>将 PasteData 转换为文本内容的内容</p>
</td>
</tr>
</tbody>
</table>

**表 5**  PasteDataProperty参数说明

<table><thead align="left"><tr id="row143351854201012"><th class="cellrowborder" valign="top" width="30%" id="mcps1.2.3.1.1"><p id="p103351154121010"><a name="p103351154121010"></a><a name="p103351154121010"></a>名称</p>
</th>
<th class="cellrowborder" valign="top" width="30%" id="mcps1.2.3.1.2"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>类型</p>
</th>
<th class="cellrowborder" valign="top" width="40%" id="mcps1.2.3.1.3"><p id="p1033585416105"><a name="p1033585416105"></a><a name="p1033585416105"></a>说明</p>
</th>
</tr>
</thead>
<tbody><tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>additions{[key:string]}</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>object</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>附加属性数据键值对</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>mimeTypes</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>Array<string></p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 中所有记录的非重复 MIME 类型</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>tag</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>string</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>PasteData 对象的用户定义标签</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>timestamp</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>number</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>时间戳，指示何时将数据写入系统粘贴板。</p>
</td>
</tr>
<tr id="row204321219393"><td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.1 "><p id="p1893413268144"><a name="p1893413268144"></a><a name="p1893413268144"></a>localOnly</p>
</td>
<td class="cellrowborder" valign="top" width="30%" headers="mcps1.2.3.1.2 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a> boolean</p>
</td>
<td class="cellrowborder" valign="top" width="40%" headers="mcps1.2.3.1.3 "><p id="p18761104812149"><a name="p18761104812149"></a><a name="p18761104812149"></a>检查 PasteData 是否设置为仅用于本地访问。</p></td>
</tr>
<tr id="row204321219393">

--- tools/ohos-pasteboard/docs/README.md ---
# ohos-pasteboard

## 概述

剪贴板命令行工具，支持对剪贴板数据的读取、写入和查询操作。适用于设置或获取 HTML、URI 或纯文本数据。不适用于非文本数据类型的设置或获取。

## 功能列表

- **设置剪贴板数据**：将 HTML、URI 或纯文本内容写入系统剪贴板
- **获取剪贴板数据**：读取文本类型的剪贴板内容
- **清空剪贴板数据**：清空剪贴板数据内容
- **检查剪贴板状态**：检查剪贴板是否有数据
- **检查数据类型**: 检查剪贴板是否有指定类型的数据
- **检查远端数据**：检查剪贴板是否有远端设备的数据

## 依赖

### 系统能力

- `PasteboardClient` - 系统剪贴板服务客户端
- `PasteData` - 剪贴板数据结构
- `PasteDataRecord` - 单条剪贴板记录

### 权限

| 权限 | 命令 | 说明 |
|-----------|----------|-------------|
| `ohos.permission.READ_PASTEBOARD` | get-data | 读取剪贴板内容所需权限 |

## 基本用法

```bash
ohos-pasteboard <command> [options]
ohos-pasteboard --help
ohos-pasteboard <command> --help
```

## 命令列表

| 命令 | 说明 | 参数 | 权限 | 前置依赖 |
|---------|-------------|------------|-------------|--------------|
| set-data | 设置剪贴板数据，支持 HTML、URI 或纯文本内容 | `--text <string>`、`--html <string>`、`--uri <string>`（至少提供一个） | 无 | 无 |
| get-data | 读取文本类型的剪贴板数据 | 无 | `ohos.permission.READ_PASTEBOARD` | 无 |
| clear-data | 清空剪贴板数据内容 | 无 | 无 | 无 |
| has-data | 检查剪贴板是否有数据 | 无 | 无 | 无 |
| has-data-type | 检查剪贴板是否有指定类型的数据 | `--type <string>`（必填） | 无 | 无 |
| has-remote-data | 检查剪贴板是否有远端设备数据 | 无 | 无 | 无 |

**前置依赖说明**：
- **无**：命令可直接执行，无需前置条件

## 输出格式

所有命令将 JSON 输出到 stdout，结构如下：

### 成功响应
```json
{
  "type": "result",
  "status": "success",
  "data": {
    // 命令特定数据
  }
}
```

### 失败响应
```json
{
  "type": "result",
  "status": "failed",
  "errCode": "ERR_XXX",
  "errMsg": "错误描述",
  "suggestion": "建议的下一步操作"
}
```

### 错误码

| 错误码 | 说明 |
|------------|-------------|
| `ERR_ARG_INVALID` | 参数值无效 |
| `ERR_ARG_MISSING` | 缺少必需参数 |
| `ERR_CMD_INVALID` | 未知命令 |
| `ERR_CROSS_BORDER` | 屏幕状态不匹配 |
| `ERR_DATA_EXPIRED` | 剪贴板数据已过期 |
| `ERR_DATA_INVALID` | 数据格式无效 |
| `ERR_DATA_SIZE` | 数据大小超限 |
| `ERR_DESERIALIZATION` | 数据反序列化失败 |
| `ERR_GET_DATA_FAILED` | 获取数据失败 |
| `ERR_GET_REMOTE` | 获取远端数据失败 |
| `ERR_INTERNAL_ERROR` | 内部系统错误 |
| `ERR_INVALID_PARAM` | 参数无效 |
| `ERR_INVALID_USER` | 用户 ID 无效 |
| `ERR_NO_DATA` | 剪贴板无数据 |
| `ERR_NO_USER_DATA` | 当前用户无剪贴板数据 |
| `ERR_PERMISSION_DENIED` | 权限不足 |
| `ERR_REMOTE_EXCEPTION` | 远端设备异常 |
| `ERR_REMOTE_TASK` | 远端任务失败 |
| `ERR_SERIALIZATION` | 数据序列化失败 |
| `ERR_SERVICE_UNAVAILABLE` | 剪贴板服务不可用 |
| `ERR_SET_DATA_FAILED` | 设置数据失败 |
| `ERR_TASK_PROCESSING` | 任务正在处理中 |
| `ERR_TIMEOUT` | 操作超时 |

## 示例

### set-data

```bash
# 将纯文本数据写入剪贴板
ohos-pasteboard set-data --text "Hello World"

# 将 HTML 数据写入剪贴板
ohos-pasteboard set-data --html "<html><p>Hello</p></html>"

# 将 URI 数据写入剪贴板
ohos-pasteboard set-data --uri "file:///path/to/file"

# 同时设置多种数据类型（创建多记录剪贴板）
ohos-pasteboard set-data --text "Hello" --html "<p>Hello</p>"
```

### get-data

```bash
# 读取剪贴板内容
ohos-pasteboard get-data

# 输出示例：
{
  "type": "result",
  "status": "success",
  "data": {
    "recordCount": 1,
    "mimeTypes": ["text/plain"],
    "records": [
      {
        "mimeType": "text/plain",
        "plainText": "Hello World"
      }
    ]
  }
}
```

### clear-data

```bash
# 清空剪贴板所有数据
ohos-pasteboard clear-data

# 输出示例：
{
  "type": "result",
  "status": "success",
  "data": {}
}
```

### has-data

```bash
# 检查剪贴板是否有内容
ohos-pasteboard has-data

# 输出示例（有数据）：
{
  "type": "result",
  "status": "success",
  "data": {
    "hasData": true
  }
}
```

### has-data-type

```bash
# 检查是否包含纯文本数据
ohos-pasteboard has-data-type --type text/plain

# 检查是否包含 HTML 数据
ohos-pasteboard has-data-type --type text/html

# 检查是否包含 URI 数据
ohos-pasteboard has-data-type --type text/uri

# 输出示例：
{
  "type": "result",
  "status": "success",
  "data": {
    "hasType": true,
    "type": "text/plain"
  }
}
```

### has-remote-data

```bash
# 检查剪贴板数据是否来自远端设备
ohos-pasteboard has-remote-data

# 输出示例（本地数据）：
{
  "type": "result",
  "status": "success",
  "data": {
    "hasRemoteData": false
  }
}
```

## 典型工作流

```bash
# 1. 检查剪贴板状态
ohos-pasteboard has-data

# 2. 设置新数据
ohos-pasteboard set-data --text "测试内容"

# 3. 验证数据已设置
ohos-pasteboard has-data-type --type text/plain

# 4. 获取数据
ohos-pasteboard get-data

# 5. 完成后清空
ohos-pasteboard clear-data
```

## 安装

CLI 工具安装于 OpenHarmony 设备的 `/system/bin/cli_tool/executable/ohos-pasteboard`。

## 构建配置

- **构建目标**：`ohos-pasteboard`
- **子系统**：`distributeddatamgr`
- **部件**：`pasteboard`


Docs context:
(none)

Operational evidence:
Build evidence:
(none)

Config/deploy evidence:
--- pasteboardEvent.yaml ---
1: 
2: #  Copyright (c) 2022-2023 Huawei Device Co., Ltd.
3: #  Licensed under the Apache License, Version 2.0 (the "License");
4: #  you may not use this file except in compliance with the License.
5: #  You may obtain a copy of the License at
6: #
7: #      http://www.apache.org/licenses/LICENSE-2.0
8: #
9: #  Unless required by applicable law or agreed to in writing, software
10: #  distributed under the License is distributed on an "AS IS" BASIS,
11: #  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
12: #  See the License for the specific language governing permissions and
13: #  limitations under the License.
14: 
15: #####################################################
16: #     below is the format of defining event         #
17: #####################################################
18: #domain: domain name.  [Only one domain name can be defined at the top]
19: #
20: #author: the author name who defined this event.
21: #date: the date when this event was defined, format is YYYY-MM-DD.
22: #logged: source file which refer to this event.
23: #usage: the usage of this event.
24: #//Define event name and event properties.
25: #@EVENT_NAME: the event definition part begin.
26: #  // __BASE is used for defining the basic info of the event.
27: #  // "type" optional values are: FAULT, STATISTICS, SECURITY, BEHAVIOR.
28: #  // "level" optional values are: CRITICAL, MINOR.
29: #  // "tag" set tags with may used by subscriber of this event, multiple tags devided by space.
30: #  // "desc" full description of this event.
31: #  @PARAMETER: {type: parameter type, arrsize: array length(optional), desc: parameter description}.
32: #  // follow the __BASE block, each line defines a parameter of this event.
33: #  // "type" optional values are: INT8, UINT8, INT16, UINT16, INT32, UINT32, INT64, UINT64, FLOAT, DOUBLE, STRING.
34: #  // "arrsize" of the parameter is an array, set a non-zero value.
35: #  // "desc" full description of this parameter.
36: 
37: #####################################################
38: #   Example of some hiviewdfx events definition     #
39: #####################################################
40: 

Troubleshooting evidence:
(none)

Source excerpts with line numbers:
(none)

Developer documentation requirements:
- Include source anchors for important claims: file path, visible symbol/function/class name when available, and why the anchor matters.
- Include a runbook when operational evidence exists: build, validation, deployment, rollback, and failure-mode notes.
- Include debugging guidance for each major module: symptom, likely source area, and command or file to inspect.
- State certainty boundaries: mark source-confirmed facts separately from inferred behavior or missing evidence.


